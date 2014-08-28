# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import h5py
import json
import numbers
import numpy
import os
import slycat.hdf5
import slycat.table
import slycat.web.server.database.couchdb
import slycat.web.server.database.hdf5
import sys
import threading
import time
import uuid

# Create a condition variable used to signal observers whenever a model is updated.
updated = threading.Condition()
# Keep track of model revisions
revision = 0
# Cache model ids
id_cache = set()

def database_monitor():
  database = slycat.web.server.database.couchdb.connect()

  # Initialize the cache ...
  global updated, revision, id_cache
  changes = database.changes(filter="slycat/models")
  with updated:
    revision = changes["last_seq"]
    for change in changes["results"]:
      if "deleted" in change:
        if change["id"] in id_cache:
          del id_cache[change["id"]]
      else:
        id_cache.add(change["id"])

  cherrypy.log.error("Initialized id cache to revision %s, loaded %s ids." % (revision, len(id_cache)))

  # Update the cache when the database changes ...
  while True:
    try:
      for change in database.changes(filter="slycat/models", feed="continuous", since=revision):
        with updated:
          if "deleted" in change:
            if change["id"] in id_cache:
              revision = change["seq"]
              updated.notify_all()
          elif "seq" in change:
            id_cache.add(change["id"])
            revision = change["seq"]
            updated.notify_all()
    except:
      cherrypy.log.error("Waiting to reconnect to database.")
      time.sleep(1.0)
      database = slycat.web.server.database.couchdb.connect()


def start_database_monitor():
  if start_database_monitor.thread is None:
    cherrypy.log.error("Starting database monitor.")
    start_database_monitor.thread = threading.Thread(name="Database Monitor", target=database_monitor)
    start_database_monitor.thread.daemon = True
    start_database_monitor.thread.start()
start_database_monitor.thread = None

def update(database, model, **kwargs):
  """Update the model, and signal any waiting threads that it's changed."""
  for name, value in kwargs.items():
    if name in ["state", "result", "started", "finished", "progress", "message"]:
      model[name] = value
  database.save(model)

def load_json_artifact(model, name):
  """Retrieve a json artifact from a model."""
  if model["artifact-types"][name] != "json":
    raise Exception("Not a json artifact.")
  return model["artifact:%s" % name]

def load_hdf5_artifact(model, name):
  """Retrieve an hdf5 artifact from a model."""
  if model["artifact-types"][name] not in ["hdf5"]:
    raise Exception("Not an hdf5 artifact.")
  return model["artifact:%s" % name]

def mix(a, b, amount):
  """Linear interpolation between two numbers.  Useful for computing model progress."""
  return ((1.0 - amount) * a) + (amount * b)

def copy_model_inputs(database, source, target):
  update(database, target, message="Copying existing model inputs.")
  for name in source["input-artifacts"]:
    original_type = source["artifact-types"][name]
    original_value = source["artifact:%s" % name]
    if original_type in ["json", "hdf5"]:
      target["artifact-types"][name] = original_type
      target["artifact:%s" % name] = original_value
      target["input-artifacts"] = list(set(target["input-artifacts"] + [name]))
    else:
      raise Exception("Cannot copy unknown input artifact type %s." & original_type)
  database.save(target)

def store_table_file(database, model, name, data, filename, nan_row_filtering, input=False):
  update(database, model, message="Loading table %s from %s." % (name, filename))
  try:
    array = slycat.table.parse(data)
  except:
    raise cherrypy.HTTPError("400 Could not parse file %s" % filename)

  storage = uuid.uuid4().hex
  with slycat.web.server.database.hdf5.create(storage) as file:
    database.save({"_id" : storage, "type" : "hdf5"})
    model["artifact:%s" % name] = storage
    model["artifact-types"][name] = "hdf5"
    if input:
      model["input-artifacts"] = list(set(model["input-artifacts"] + [name]))
    database.save(model)
    arrayset = slycat.hdf5.ArraySet(file)
    arrayset.store_array(0, array)

def store_parameter(database, model, name, value, input=False):
  model["artifact:%s" % name] = value
  model["artifact-types"][name] = "json"
  if input:
    model["input-artifacts"] = list(set(model["input-artifacts"] + [name]))
  database.save(model)

def store_file_artifact(database, model, name, value, content_type, input=False):
  fid = database.write_file(model, content=value, content_type=content_type)
  model = database[model["_id"]] # This is a workaround for the fact that put_attachment() doesn't update the revision number for us.
  model["artifact:%s" % name] = fid
  model["artifact-types"][name] = "file"
  if input:
    model["input-artifacts"] = list(set(model["input-artifacts"] + [name]))
  database.save(model)
  return model

def store_json_file_artifact(database, model, name, value, input=False):
  return store_file_artifact(database, model, name, json.dumps(value, separators=(",",":")), "application/json", input)

def start_array_set(database, model, name, input=False):
  """Start a model array set artifact."""
  update(database, model, message="Starting array set %s." % (name))
  storage = uuid.uuid4().hex
  with slycat.web.server.database.hdf5.create(storage) as file:
    arrayset = slycat.hdf5.start_arrayset(file)
    database.save({"_id" : storage, "type" : "hdf5"})
    model["artifact:%s" % name] = storage
    model["artifact-types"][name] = "hdf5"
    if input:
      model["input-artifacts"] = list(set(model["input-artifacts"] + [name]))
    database.save(model)

def start_array(database, model, name, array_index, attributes, dimensions):
  update(database, model, message="Starting array set %s array %s." % (name, array_index))
  storage = model["artifact:%s" % name]

  with slycat.web.server.database.hdf5.open(storage, "r+") as file:
    slycat.hdf5.ArraySet(file).start_array(array_index, dimensions, attributes)

def store_array_attribute(database, model, name, array_index, attribute_index, hyperslice, data, byteorder=None):
  update(database, model, message="Storing array set %s array %s attribute %s." % (name, array_index, attribute_index))
  storage = model["artifact:%s" % name]
  with slycat.web.server.database.hdf5.open(storage, "r+") as file:
    hdf5_array = slycat.hdf5.ArraySet(file)[array_index]

    # Convert data to an array ...
    stored_type = slycat.hdf5.dtype(hdf5_array.attributes[attribute_index]["type"])
    if isinstance(data, numpy.ndarray):
      pass
    elif isinstance(data, list):
      data = numpy.array(data, dtype=stored_type)
    else:
      if byteorder is None:
        data = numpy.array(json.load(data.file), dtype=stored_type)
      elif byteorder == sys.byteorder:
        data = numpy.fromfile(data.file, dtype=stored_type)
      else:
        raise NotImplementedError()

    hdf5_array.set_data(attribute_index, hyperslice, data)

def store_array_set_data(database, model, name, hyperchunks, data, byteorder):
  update(database, model, message="Storing data to array set %s." % (name))

  if byteorder is None:
    data = json.load(data.file)
    data_iterator = iter(data)

  with slycat.web.server.database.hdf5.open(model["artifact:%s" % name], "r+") as file:
    for array, attribute, hyperslices in hyperchunks:
      hdf5_array = slycat.hdf5.ArraySet(file)[array]
      for hyperslice in hyperslices:
        cherrypy.log.error("Writing to array %s attribute %s hyperslice %s" % (array, attribute, hyperslice))

        if hyperslice == Ellipsis or hyperslice == (Ellipsis,):
          data_shape = [dimension["end"] - dimension["begin"] for dimension in hdf5_array.dimensions]
        else:
          data_shape = []
          for hyperslice_dimension, array_dimension in zip(hyperslice, hdf5_array.dimensions):
            if isinstance(hyperslice_dimension, numbers.Integral):
              data_shape.append(1)
            elif isinstance(hyperslice_dimension, type(Ellipsis)):
              data_shape.append(array_dimension["end"] - array_dimension["begin"])
            elif isinstance(hyperslice_dimension, slice):
              # TODO: Handle step
              start, stop, step = hyperslice_dimension.indices(array_dimension["end"] - array_dimension["begin"])
              data_shape.append(stop - start)
            else:
              raise ValueError("Unexpected hyperslice: %s" % hyperslice_dimension)

        # Convert data to an array ...
        data_type = slycat.hdf5.dtype(hdf5_array.attributes[attribute]["type"])
        data_size = numpy.prod(data_shape)

        if byteorder is None:
          hyperslice_data = numpy.array(data_iterator.next(), dtype=data_type).reshape(data_shape)
        elif byteorder == sys.byteorder:
          hyperslice_data = numpy.fromfile(data.file, dtype=data_type, count=data_size).reshape(data_shape)
        else:
          raise NotImplementedError()

        hdf5_array.set_data(attribute, hyperslice, hyperslice_data)

