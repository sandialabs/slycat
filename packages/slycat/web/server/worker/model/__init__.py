# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import datetime
import itertools
import json
import multiprocessing
import os
import Queue
import slycat.web.server.database.couchdb
import slycat.web.server.database.scidb
import slycat.web.server.spider
import slycat.web.server.ssh
import slycat.web.server.worker
import stat
import struct
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

  def get_model_table_columns(self, arguments):
    try:
      name = arguments["name"]
      with self.model_lock:
        if name not in self.artifacts:
          raise cherrypy.HTTPError("400 No artifact: %s" % name)
        if self.artifact_types[name] != "table":
          raise cherrypy.HTTPError("400 Not a table: %s" % name)
        with self.scidb.query("aql", "select name from %s" % self.artifacts[name]["column-names"]) as results:
          column_names = [value.getString() for attribute in results for value in attribute]
        with self.scidb.query("aql", "select type_id from attributes(%s)" % self.artifacts[name]["columns"]) as results:
          column_types = [value.getString() for attribute in results for value in attribute]
        return {"column-names":column_names, "column-types":column_types}
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
          if original_type in ["json", "table", "timeseries"]:
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
      artifact = table_artifact(table["column-names"], table["column-types"])
      artifact.store_columns(table["row-count"], table["columns"])
      value = artifact.finish()
      self.update_artifact(name=name, value=value, type="table", input=True)
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
      artifact = table_artifact(table["column-names"], table["column-types"])
      artifact.store_columns(table["row-count"], table["columns"])
      value = artifact.finish()
      self.update_artifact(name=name, value=value, type="table", input=True)
      self.set_message("Loaded remote table %s." % name)
    except KeyError as e:
      raise cherrypy.HTTPError("400 Missing key: %s" % e.message)

  def post_model_start_table(self, arguments):
    try:
      name = arguments["name"]
      column_names = arguments["column-names"]
      column_types = arguments["column-types"]
      if len(column_names) != len(column_types):
        raise cherrypy.HTTPError("400 column-names and column-types lengths must match.")
      self.start_table_artifact(name, column_names, column_types)
      self.set_message("Started table %s." % name)
    except KeyError as e:
      raise cherrypy.HTTPError("400 Missing key: %s" % e.message)

  def post_model_send_table_rows(self, arguments):
    try:
      name = arguments["name"]
      rows = arguments["rows"]
      self.send_table_artifact_binary_rows(name, rows)
    except KeyError as e:
      raise cherrypy.HTTPError("400 Missing key: %s" % e.message)

  def post_model_finish_table(self, arguments):
    try:
      name = arguments["name"]
      self.finish_table_artifact(name, input=True)
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
      self.set_message("Timeseries %s stored %s rows." % (name, self.artifacts[name].row_count))
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
    self.scidb = slycat.web.server.database.scidb.connect()

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

  def start_table_artifact(self, name, column_names, column_types):
    with self.model_lock:
      self.artifacts[name] = table_artifact(column_names, column_types)

  def send_table_artifact_binary_rows(self, name, rows):
    self.artifacts[name].store_binary_rows(rows)

  def finish_table_artifact(self, name, input):
    value = self.artifacts[name].finish()
    self.update_artifact(name=name, value=value, type="table", input=input)

  def start_timeseries_artifact(self, name, column_names, column_types):
    with self.model_lock:
      self.artifacts[name] = timeseries_artifact(column_names, column_types)

  def send_timeseries_artifact_binary_rows(self, name, rows):
    self.artifacts[name].store_binary_rows(rows)

  def finish_timeseries_artifact(self, name, input):
    value = self.artifacts[name].finish()
    self.update_artifact(name=name, value=value, type="timeseries", input=input)

  def start_array_artifact(self, name, attributes, dimensions):
    with self.model_lock:
      self.artifacts[name] = array_artifact(attributes, dimensions)

  def send_array_artifact_data(self, name, data):
    self.artifacts[name].store_data(data)

  def finish_array_artifact(self, name, input):
    value = self.artifacts[name].finish()
    self.update_artifact(name=name, value=value, type="array", input=input)

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
      raise Exception("Not a JSON artifact.")
    return self.artifacts[name]

  def load_table_artifact(self, name):
    if self.artifact_types[name] != "table":
      raise Exception("Not a table artifact.")
    return self.artifacts[name]

  def load_timeseries_artifact(self, name):
    if self.artifact_types[name] != "timeseries":
      raise Exception("Not a timeseries artifact.")
    return self.artifacts[name]

  def compute_model():
    raise NotImplementedError()

class table_artifact:
  """Encapsulates all of the logic and state for incremental storage of a table to SciDB."""
  def __init__(self, column_names, column_types):
    self.scidb = slycat.web.server.database.scidb.connect()
    self.couchdb = slycat.web.server.database.couchdb.connect()

    self.column_types = column_types
    self.columns = "a" + uuid.uuid4().hex
    self.column_names = "a" + uuid.uuid4().hex
    self.scidb.execute("aql", "create array %s<name:string>[index=0:*,100,0]" % (self.column_names))
    self.couchdb.save({"_id":self.column_names, "type":"array"})
    self.scidb.execute("aql", "insert into %s '[%s]'" % (self.column_names, ",".join(["(\"%s\")" % name for name in column_names])))
    self.scidb.execute("aql", "create array %s<%s>[row=0:*,1000000,0]" % (self.columns, ",".join(["c%s:%s" % (column_index, column_type) for column_index, column_type in enumerate(column_types)])))
    self.couchdb.save({"_id":self.columns, "type":"array"})

    self.named_pipe = None
    self.stream = None
    self.thread = None
    self.row_count = 0

  def get_stream(self):
    def load_data(database, array, named_pipe, column_types):
      database.execute("aql", "load %s from '%s' as '(%s)'" % (array, named_pipe, ",".join(column_types)))

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

  def store_rows(self, rows):
    stream = self.get_stream()
    for row in rows:
      for type, value in itertools.izip(self.column_types, row):
        if type == "string":
          stream.write(struct.pack("<I", len(value) + 1))
          stream.write(value)
          stream.write("\0")
        elif type == "double":
          stream.write(struct.pack("<d", value))
      self.row_count += 1

  def store_columns(self, row_count, columns):
    stream = self.get_stream()
    column_count = len(columns)
    for row in range(row_count):
      for column in range(column_count):
        value = columns[column][row]
        if self.column_types[column] == "string":
          stream.write(struct.pack("<I", len(value) + 1))
          stream.write(value)
          stream.write("\0")
        elif self.column_types[column] == "double":
          stream.write(struct.pack("<d", value))
      self.row_count += 1

  def finish(self):
    if self.stream is not None:
      self.stream.close()
    if self.thread is not None:
      self.thread.join()
    if self.named_pipe is not None:
      os.unlink(self.named_pipe)
    return {"column-names" : self.column_names, "columns" : self.columns}

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
    self.row_count = 0

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
      self.row_count += 1

  def finish(self):
    if self.stream is not None:
      self.stream.close()
    if self.thread is not None:
      self.thread.join()
    if self.named_pipe is not None:
      os.unlink(self.named_pipe)
    return {"column-names" : self.column_names, "columns" : self.columns}

class array_artifact:
  """Encapsulates all of the logic and state for incremental storage of a multidimensional array to SciDB."""
  def __init__(self, attributes, dimensions):
    self.attributes = attributes
    self.dimensions = dimensions
    self.scidb = slycat.web.server.database.scidb.connect()
    self.couchdb = slycat.web.server.database.couchdb.connect()

    self.attribute_names_array = "a" + uuid.uuid4().hex
    self.scidb.execute("aql", "create array %s<name:string>[index=0:%s,100,0]" % (self.attribute_names_array, len(attributes)))
    self.couchdb.save({"_id":self.attribute_names_array, "type":"array"})
    self.scidb.execute("aql", "insert into %s '[%s]'" % (self.attribute_names_array, ",".join(["(\"%s\")" % name for name, type in attributes])))

    self.dimension_names_array = "a" + uuid.uuid4().hex
    self.scidb.execute("aql", "create array %s<name:string>[index=0:%s,100,0]" % (self.dimension_names_array, len(dimensions)))
    self.couchdb.save({"_id":self.dimension_names_array, "type":"array"})
    self.scidb.execute("aql", "insert into %s '[%s]'" % (self.dimension_names_array, ",".join(["(\"%s\")" % name for name, size, chunk in dimensions])))

    self.data_array = "a" + uuid.uuid4().hex
    self.scidb.execute("aql", "create array %s<%s>[%s]" % (self.data_array, ",".join(["a%s:%s" % (index, type) for index, (name, type) in enumerate(attributes)]), ",".join(["d%s=0:%s,%s,0" % (index, size-1, chunk) for index, (name, size, chunk) in enumerate(dimensions)])))
    self.couchdb.save({"_id":self.data_array, "type":"array"})

    self.named_pipe = None
    self.stream = None
    self.thread = None
    self.row_count = 0

  def get_stream(self):
    def load_data(database, array, named_pipe, attribute_types):
      database.execute("aql", "load %s from '%s' as '(%s)'" % (array, named_pipe, ",".join(attribute_types)))

    if self.stream is None:
      self.named_pipe = "/tmp/%s" % self.data_array
      os.mkfifo(self.named_pipe, 0666)
      self.thread = multiprocessing.Process(target=load_data, args=(self.scidb, self.data_array, self.named_pipe, [type for name, type in self.attributes]))
      self.thread.daemon = True
      self.thread.start()
      self.stream = open(self.named_pipe, "w")
    return self.stream

  def store_binary_data(self, data):
    self.get_stream().write(data.read())

  def store_data(self, data):
    stream = self.get_stream()
    for datum in data:
      stream.write(struct.pack("<d", datum))

  def finish(self):
    if self.stream is not None:
      self.stream.close()
    if self.thread is not None:
      self.thread.join()
    if self.named_pipe is not None:
      os.unlink(self.named_pipe)
    return {"attribute-names" : self.attribute_names_array, "dimension-names" : self.dimension_names_array, "data" : self.data_array}

