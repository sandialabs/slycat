# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import datetime
import h5py
import itertools
import json
import multiprocessing
import numpy
import os
import Queue
import slycat.web.server.database.couchdb
import slycat.web.server.database.hdf5
import slycat.web.server.database.scidb
import slycat.web.server.spider
import slycat.web.server.ssh
import slycat.web.server.worker
import stat
import struct
import sys
import threading
import time
import uuid

class prototype(slycat.web.server.worker.prototype):
  """Worker that computes and stores a model.  Derivatives must implement the
  compute_model() method."""
  def __init__(self, security, name, pid, mid, model_type, model_name, model_marking, model_description, incremental = False):
    slycat.web.server.worker.prototype.__init__(self, security, name)

    self.mid = mid
    self.incremental = incremental
    self.requests = Queue.Queue()

    self.artifacts = {}
    self.artifact_types = {}
    self.input_artifacts = set()

    self.ssh = None
    self.sftp = None

    # Create the model ...
    self.model = {
      "_id": mid,
      "type": "model",
      "model-type": model_type,
      "marking": model_marking,
      "project": pid,
      "created": datetime.datetime.utcnow().isoformat(),
      "creator": self.security["user"],
      "name": model_name,
      "description": model_description,
      "artifact-types": self.artifact_types,
      "input-artifacts": list(self.input_artifacts)
      }
    slycat.web.server.database.couchdb.connect().save(self.model)
    self.model_lock = threading.Lock()

  def update_artifact(self, name, type, value, input):
    with self.model_lock:
      self.artifacts[name] = value
      self.artifact_types[name] = type
      if input:
        self.input_artifacts.add(name)
      else:
        self.input_artifacts.discard(name)

      self.model["artifact:%s" % name] = value
      self.model["artifact-types"] =  self.artifact_types
      self.model["input-artifacts"] = list(self.input_artifacts)
      slycat.web.server.database.couchdb.connect().save(self.model)

  def get_model_browse(self, arguments):
    try:
      if self.sftp is None:
        raise cherrypy.HTTPError("400 No remote connection.")
      path = arguments["path"]
      attributes = sorted(self.sftp.listdir_attr(path), key=lambda x: x.filename)
      names = [attribute.filename for attribute in attributes]
      sizes = [attribute.st_size for attribute in attributes]
      types = ["d" if stat.S_ISDIR(attribute.st_mode) else "f" for attribute in attributes]
      response = {"path" : path, "names" : names, "sizes" : sizes, "types" : types}
      return response
    except KeyError as e:
      raise cherrypy.HTTPError("400 Missing key: %s" % e.message)

  def put_model_remote_connection(self, arguments):
    try:
      if self.ssh is not None:
        self.ssh.close()
        self.sftp = None
      self.ssh = slycat.web.server.ssh.connect(arguments["hostname"], arguments["username"], arguments["password"])
      self.sftp = self.ssh.open_sftp()
    except KeyError as e:
      raise cherrypy.HTTPError("400 Missing key: %s" % e.message)

  def post_model_copy_model_inputs(self, arguments):
    try:
      mid = arguments["mid"]
      database = slycat.web.server.database.couchdb.connect()
      original_model = database.get("model", mid)
      if original_model["project"] != self.model["project"]:
        raise cherrypy.HTTPError("400 Cannot duplicate a model from another project.")
      with self.model_lock:
        for name in original_model["input-artifacts"]:
          self.set_message("Copying existing model input %s." % name)
          cherrypy.log.error("Copying artifact %s" % name)
          original_type = original_model["artifact-types"][name]
          original_value = original_model["artifact:%s" % name]
          if original_type in ["json", "hdf5", "timeseries"]:
            self.artifact_types[name] = original_type
            self.input_artifacts.add(name)
            self.artifacts[name] = original_value
            self.model["artifact:%s" % name] = original_value
          else:
            raise Exception("Cannot copy unknown input artifact type %s." & original_type)
      self.model["artifact-types"] = self.artifact_types
      self.model["input-artifacts"] = list(self.artifact_types)
      slycat.web.server.database.couchdb.connect().save(self.model)
    except KeyError as e:
      raise cherrypy.HTTPError("400 Missing key: %s" % e.message)

  def post_model_set_parameter(self, arguments):
    try:
      name = arguments["name"]
      value = arguments["value"]
      self.store_json_artifact(name, value, input=True)
    except KeyError as e:
      raise cherrypy.HTTPError("400 Missing key: %s" % e.message)

  def post_model_load_table(self, arguments):
    try:
      name = arguments["name"]
      file = arguments["file"]
      nan_row_filtering = arguments.get("nan-row-filtering", False)
      self.set_message("Loading table %s." % name)
      content = file.file.read()
      tables = [perspective for perspective in slycat.web.server.spider.extract(type="table", content=content, filename=file.filename, nan_row_filtering=nan_row_filtering) if perspective["type"] == "table"]
      if len(tables) != 1:
        raise cherrypy.HTTPError("400 Remote file %s must contain exactly one table." % file.filename)
      table = tables[0]

      attributes = zip(table["column-names"], table["column-types"])
      dimensions = [("row", "int64", 0, table["row-count"])]
      artifact = hdf5_array_set()
      artifact.create_array(0, attributes, dimensions)
      for attribute, data in enumerate(table["columns"]):
        artifact.store_attribute(0, attribute, [(0, len(data))], data)
      value = artifact.finish()
      self.update_artifact(name=name, value=value, type="hdf5", input=True)
      self.set_message("Loaded table %s." % name)
    except KeyError as e:
      raise cherrypy.HTTPError("400 Missing key: %s" % e.message)

  def post_model_load_remote_table(self, arguments):
    try:
      if self.sftp is None:
        raise cherrypy.HTTPError("400 No remote connection.")
      name = arguments["name"]
      path = arguments["path"]
      nan_row_filtering = arguments.get("nan-row-filtering", False)
      if stat.S_ISDIR(self.sftp.stat(path).st_mode):
        raise cherrypy.HTTPError("400 Cannot load directory %s." % path)
      content = self.sftp.file(path).read()
      tables = [perspective for perspective in slycat.web.server.spider.extract(type="table", content=content, filename=path, nan_row_filtering=nan_row_filtering) if perspective["type"] == "table"]
      if len(tables) != 1:
        raise cherrypy.HTTPError("400 Remote file %s must contain exactly one table." % path)
      table = tables[0]
      attributes = zip(table["column-names"], table["column-types"])
      dimensions = [("row", "int64", 0, table["row-count"])]
      artifact = hdf5_array_set()
      artifact.create_array(0, attributes, dimensions)
      for attribute, data in enumerate(table["columns"]):
        artifact.store_attribute(0, attribute, [(0, len(data))], data)
      value = artifact.finish()
      self.update_artifact(name=name, value=value, type="hdf5", input=True)
      self.set_message("Loaded remote table %s." % name)
    except KeyError as e:
      raise cherrypy.HTTPError("400 Missing key: %s" % e.message)

  def post_model_start_table(self, arguments):
    try:
      name = arguments["name"]
      row_count = arguments["row-count"]
      column_names = arguments["column-names"]
      column_types = arguments["column-types"]
      if len(column_names) != len(column_types):
        raise cherrypy.HTTPError("400 column-names and column-types lengths must match.")
      with self.model_lock:
        attributes = zip(column_names, column_types)
        dimensions = [("row", "int64", 0, row_count)]
        self.artifacts[name] = hdf5_array_set(attributes, dimensions)
        self.set_message("Started table %s." % name)
    except KeyError as e:
      raise cherrypy.HTTPError("400 Missing key: %s" % e.message)

  def post_model_send_table_column(self, arguments):
    try:
      name = arguments["name"]
      column = int(arguments["column"])
      begin = int(arguments["begin"])
      end = int(arguments["end"])
      data = arguments["data"]
      byteorder = arguments.get("byteorder", None)
      self.artifacts[name].store_attribute_file(column, [(begin, end)], data, byteorder)
    except KeyError as e:
      raise cherrypy.HTTPError("400 Missing key: %s" % e.message)

  def post_model_finish_table(self, arguments):
    try:
      name = arguments["name"]
      value = self.artifacts[name].finish()
      self.update_artifact(name=name, value=value, type="hdf5", input=True)
      self.set_message("Finished table %s." % name)
    except KeyError as e:
      raise cherrypy.HTTPError("400 Missing key: %s" % e.message)

  def post_model_start_timeseries(self, arguments):
    try:
      name = arguments["name"]
      column_names = arguments["column-names"]
      column_types = arguments["column-types"]
      if len(column_names) != len(column_types):
        raise cherrypy.HTTPError("400 column-names and column-types lengths must match.")
      self.start_timeseries_artifact(name, column_names, column_types)
      self.set_message("Started timeseries %s." % name)
    except KeyError as e:
      raise cherrypy.HTTPError("400 Missing key: %s" % e.message)

  def post_model_send_timeseries_rows(self, arguments):
    try:
      name = arguments["name"]
      rows = arguments["rows"]
      self.send_timeseries_artifact_binary_rows(name, rows)
    except KeyError as e:
      raise cherrypy.HTTPError("400 Missing key: %s" % e.message)

  def post_model_finish_timeseries(self, arguments):
    try:
      name = arguments["name"]
      self.finish_timeseries_artifact(name, input=True)
      self.set_message("Finished timeseries %s." % name)
    except KeyError as e:
      raise cherrypy.HTTPError("400 Missing key: %s" % e.message)

  def post_model_finish_model(self, arguments):
    try:
      self.requests.put({"request":"finish-model"})
      return { "mid" : self.mid }
    except KeyError as e:
      raise cherrypy.HTTPError("400 Missing key: %s" % e.message)

  def work(self):
    self.couchdb = slycat.web.server.database.couchdb.connect()

    # Store the worker ID in the model ...
    with self.model_lock:
      self.model["worker"] =  self.status["_id"]
      slycat.web.server.database.couchdb.connect().save(self.model)

    # Optionally, wait for clients to add input artifacts to the model ...
    if self.incremental:
      self.set_message("Waiting for requests.")
      while True:

        if self.stopped:
          return

        try:
          request = self.requests.get(timeout=1)
        except Queue.Empty:
          continue

        if request["request"] == "finish-model":
          break
        else:
          raise Exception("Unknown request: %s" % request)

    # Compute the model ...
    self.compute_model()

    # Finish-up ...
    self.set_uri(cherrypy.tree.apps[""].config["slycat"]["server-root"] + "models/" + self.mid)
    self.set_message("Finished.")

  def store_json_artifact(self, name, value, input):
    """Stores an artifact as JSON."""
    self.update_artifact(name=name, value=value, type="json", input=input)

  def start_timeseries_artifact(self, name, column_names, column_types):
    with self.model_lock:
      self.artifacts[name] = timeseries_artifact(column_names, column_types)

  def send_timeseries_artifact_binary_rows(self, name, rows):
    self.artifacts[name].store_binary_rows(rows)

  def finish_timeseries_artifact(self, name, input):
    value = self.artifacts[name].finish()
    self.update_artifact(name=name, value=value, type="timeseries", input=input)

  def start_array_set(self, name):
    with self.model_lock:
      self.artifacts[name] = hdf5_array_set()

  def create_array(self, name, array, attributes, dimensions):
    self.artifacts[name].create_array(array, attributes, dimensions)

  def store_array_attribute(self, name, array, attribute, ranges, data):
    self.artifacts[name].store_attribute(array, attribute, ranges, data)

  def finish_array_set(self, name, input):
    value = self.artifacts[name].finish()
    self.update_artifact(name=name, value=value, type="hdf5", input=input)

  def store_file_artifact(self, name, value, content_type, input):
    """Stores an artifact as a file.  Returns the fid."""
    with self.model_lock:
      fid = self.couchdb.write_file(self.model, content=value, content_type=content_type)
      self.model = self.couchdb[self.mid] # This is a workaround for the fact that put_attachment() doesn't update the underlying document object.
    self.update_artifact(name, "file", fid, input)

  def store_json_file_artifact(self, name, value, input):
    """Stores an artifact as a file with JSON encoding.  Returns the fid."""
    self.store_file_artifact(name, json.dumps(value, separators=(",",":")), "application/json", input)

  def load_json_artifact(self, name):
    if self.artifact_types[name] != "json":
      raise Exception("Not a json artifact.")
    return self.artifacts[name]

  def load_hdf5_artifact(self, name):
    if self.artifact_types[name] not in ["hdf5"]:
      raise Exception("Not an hdf5 artifact.")
    return self.artifacts[name]

  def load_timeseries_artifact(self, name):
    if self.artifact_types[name] != "timeseries":
      raise Exception("Not a timeseries artifact.")
    return self.artifacts[name]

  def compute_model():
    raise NotImplementedError()

class hdf5_array_set:
  """Encapsulates all of the logic and state for incremental storage of a collection of arrays to hdf5."""
  def __init__(self):
    """Create the underlying file and prepare to receive data."""
    self.storage = uuid.uuid4().hex
    self.couchdb = slycat.web.server.database.couchdb.connect()
    self.file = slycat.web.server.database.hdf5.create(self.storage)
    self.couchdb.save({"_id":self.storage, "type":"hdf5"})

  def create_array(self, array_index, attributes, dimensions):
    """Allocate storage for a new array and prepare to receive data."""
    # Sanity-check inputs ...
    type_map = {"int8":"int8", "int16":"int16", "int32":"int32", "int64":"int64", "uint8":"uint8", "uint16":"uint16", "uint32":"uint32", "uint64":"uint64", "float32":"float32", "float64":"float64", "float":"float32", "double":"float64", "string":"string"}
    attributes = [(name, type_map[type]) for name, type in attributes]
    dimensions = [(name, type_map[type], begin, end) for name, type, begin, end in dimensions]

    # Allocate space for the coming data ...
    stored_types = [slycat.web.server.database.hdf5.dtype(type) for name, type in attributes]
    shape = [end - begin for name, type, begin, end in dimensions]
    for attribute_index, stored_type in enumerate(stored_types):
      self.file.create_dataset("array/{}/attribute/{}".format(array_index, attribute_index), shape, dtype=stored_type)

    # Store array metadata ...
    array_metadata = self.file.array(array_index).attrs
    array_metadata["attribute-names"] = numpy.array([name for name, type in attributes], dtype=h5py.special_dtype(vlen=unicode))
    array_metadata["attribute-types"] = numpy.array([type for name, type in attributes], dtype=h5py.special_dtype(vlen=unicode))
    array_metadata["dimension-names"] = numpy.array([name for name, type, begin, end in dimensions], dtype=h5py.special_dtype(vlen=unicode))
    array_metadata["dimension-types"] = numpy.array([type for name, type, begin, end in dimensions], dtype=h5py.special_dtype(vlen=unicode))
    array_metadata["dimension-begin"] = numpy.array([begin for name, type, begin, end in dimensions], dtype="int64")
    array_metadata["dimension-end"] = numpy.array([end for name, type, begin, end in dimensions], dtype="int64")

  def store_attribute(self, array, attribute, ranges, data):
    """Use a numpy array or array-like object to populate an attribute hyperslice."""
    array_metadata = self.file.array(array).attrs
    if not (0 <= attribute and attribute < len(array_metadata["attribute-names"])):
      raise Exception("Attribute index {} out-of-range.".format(attribute))
    for dimension_begin, dimension_end, (range_begin, range_end) in zip(array_metadata["dimension-begin"], array_metadata["dimension-end"], ranges):
      if not (dimension_begin <= range_begin and range_begin <= dimension_end):
        raise Exception("Begin index {} out-of-range.".format(begin))
      if not (range_begin <= range_end and range_end <= dimension_end):
        raise Exception("End index {} out-of-range.".format(end))

    index = tuple([slice(begin, end) for begin, end in ranges])
    stored_type = slycat.web.server.database.hdf5.dtype(array_metadata["attribute-types"][attribute])
    self.file.array_attribute(array, attribute)[index] = numpy.array(data, dtype=stored_type)

  def store_attribute_file(self, attribute, ranges, data, byteorder):
    """Use a file-like object containing JSON or raw bytes to populate an attribute hyperslice."""
    array_metadata = self.file.array(array).attrs
    if not (0 <= attribute and attribute < len(array_metadata["attribute-names"])):
      raise Exception("Attribute index {} out-of-range.".format(attribute))
    for dimension_begin, dimension_end, (range_begin, range_end) in zip(array_metadata["dimension-begin"], array_metadata["dimension-end"], ranges):
      if not (dimension_begin <= range_begin and range_begin <= dimension_end):
        raise Exception("Begin index {} out-of-range.".format(begin))
      if not (range_begin <= range_end and range_end <= dimension_end):
        raise Exception("End index {} out-of-range.".format(end))

    index = tuple([slice(begin, end) for begin, end in ranges])
    stored_type = slycat.web.server.database.hdf5.dtype(array_metadata["attribute-types"][attribute])

    if byteorder is None:
      content = json.load(data.file)
      self.file.array_attribute(array, attribute)[index] = numpy.array(content, dtype=stored_type)
    elif byteorder == sys.byteorder:
      content = numpy.fromfile(data.file, dtype = metadata["attribute-types"][attribute])
      self.file.array_attribute(array, attribute)[index] = content
    else:
      raise NotImplementedError()

  def finish(self):
    self.file.close()
    return {"storage" : self.storage}

class timeseries_artifact:
  """Encapsulates all of the logic and state for incremental storage of a set of related timeseries to SciDB."""
  def __init__(self, column_names, column_types):
    self.scidb = slycat.web.server.database.scidb.connect()
    self.couchdb = slycat.web.server.database.couchdb.connect()

    self.column_types = column_types
    self.columns = "a" + uuid.uuid4().hex
    self.column_names = "a" + uuid.uuid4().hex
    self.scidb.execute("aql", "create array %s<name:string>[index=0:*,100,0]" % (self.column_names))
    self.couchdb.save({"_id":self.column_names, "type":"array"})
    self.scidb.execute("aql", "insert into %s '[%s]'" % (self.column_names, ",".join(["(\"%s\")" % name for name in column_names])))
    self.scidb.execute("aql", "create array %s<timeseries:int64, time:double,%s>[row=0:*,500000,0]" % (self.columns, ",".join(["c%s:%s" % (column_index, column_type) for column_index, column_type in enumerate(column_types)])))
    self.couchdb.save({"_id":self.columns, "type":"array"})

    self.named_pipe = None
    self.stream = None
    self.thread = None

  def get_stream(self):
    def load_data(database, array, named_pipe, column_types):
      database.execute("aql", "load %s from '%s' as '(%s)'" % (array, named_pipe, ",".join(["int64", "double"] + column_types)))

    if self.stream is None:
      self.named_pipe = "/tmp/%s" % self.columns
      os.mkfifo(self.named_pipe, 0666)
      self.thread = multiprocessing.Process(target=load_data, args=(self.scidb, self.columns, self.named_pipe, self.column_types))
      self.thread.daemon = True
      self.thread.start()
      self.stream = open(self.named_pipe, "w")
    return self.stream

  def store_binary_rows(self, rows):
    self.get_stream().write(rows.file.read())

  def store_rows(self, ids, times, rows):
    stream = self.get_stream()
    for id, time, row in zip(ids, times, rows):
      stream.write(struct.pack("<qd", id, time))
      for type, value in itertools.izip(self.column_types, row):
        if type == "string":
          stream.write(struct.pack("<I", len(value) + 1))
          stream.write(value)
          stream.write("\0")
        elif type == "double":
          stream.write(struct.pack("<d", value))

  def finish(self):
    if self.stream is not None:
      self.stream.close()
    if self.thread is not None:
      self.thread.join()
    if self.named_pipe is not None:
      os.unlink(self.named_pipe)
    return {"column-names" : self.column_names, "columns" : self.columns}

