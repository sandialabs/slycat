# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import numpy
import slycat.hdf5
import slycat.web.server.database.hdf5
import uuid

def mix(a, b, amount):
  """Linear interpolation between two numbers.  Useful for computing model progress."""
  return ((1.0 - amount) * a) + (amount * b)

def update_model(database, model, **kwargs):
  """Update the model, and signal any waiting threads that it's changed."""
  for name, value in kwargs.items():
    if name in ["state", "result", "started", "finished", "progress", "message"]:
      model[name] = value
  database.save(model)

def get_model_arrayset_data(database, model, name, hyperchunks):
  if isinstance(hyperchunks, tuple):
    hyperchunks = [hyperchunks]
  hyperchunks = [(array, attribute, hyperslices if isinstance(hyperslices, list) else [hyperslices]) for array, attribute, hyperslices in hyperchunks]

  with slycat.web.server.database.hdf5.open(model["artifact:%s" % name], "r") as file:
    for array, attribute, hyperslices in hyperchunks:
      hdf5_array = slycat.hdf5.ArraySet(file)[array]
      #stored_type = slycat.hdf5.dtype(hdf5_array.attributes[attribute]["type"])
      for hyperslice in hyperslices:
        cherrypy.log.error("Reading from arrayset %s array %s attribute %s hyperslice %s" % (name, array, attribute, hyperslice))
        yield hdf5_array.get_data(attribute)[hyperslice]

def get_model_arrayset_metadata(database, model, name, arrays=None, statistics=None):
  with slycat.web.server.database.hdf5.lock:
    if arrays is not None or statistics is not None:
      with slycat.web.server.database.hdf5.open(model["artifact:%s" % name], "r") as file:
        hdf5_arrayset = slycat.hdf5.ArraySet(file)
        results = {}
        if arrays is not None:
          results["arrays"] = []
          for array in arrays:
            hdf5_array = hdf5_arrayset[array]
            results["arrays"].append({
              "index" : int(array),
              "dimensions" : hdf5_array.dimensions,
              "attributes" : hdf5_array.attributes,
              })
        if statistics is not None:
          results["statistics"] = []
          for array, attribute in statistics:
            statistics = hdf5_arrayset[array].get_statistics(attribute)
            statistics["array"] = int(array)
            statistics["attribute"] = int(attribute)
            results["statistics"].append(statistics)
        return results

    with slycat.web.server.database.hdf5.open(model["artifact:%s" % name], "r") as file:
      hdf5_arrayset = slycat.hdf5.ArraySet(file)
      results = []
      for array in sorted(hdf5_arrayset.keys()):
        hdf5_array = hdf5_arrayset[array]
        results.append({
          "array": int(array),
          "index" : int(array),
          "dimensions" : hdf5_array.dimensions,
          "attributes" : hdf5_array.attributes,
          })
      return results

def get_model_parameter(database, model, name):
  return model["artifact:" + name]

def put_model_arrayset(database, model, name, input=False):
  """Start a new model array set artifact."""
  slycat.web.server.update_model(database, model, message="Starting array set %s." % (name))
  storage = uuid.uuid4().hex
  with slycat.web.server.database.hdf5.create(storage) as file:
    arrayset = slycat.hdf5.start_arrayset(file)
    database.save({"_id" : storage, "type" : "hdf5"})
    model["artifact:%s" % name] = storage
    model["artifact-types"][name] = "hdf5"
    if input:
      model["input-artifacts"] = list(set(model["input-artifacts"] + [name]))
    database.save(model)

def put_model_array(database, model, name, array_index, attributes, dimensions):
  slycat.web.server.update_model(database, model, message="Starting array set %s array %s." % (name, array_index))
  storage = model["artifact:%s" % name]
  with slycat.web.server.database.hdf5.open(storage, "r+") as file:
    slycat.hdf5.ArraySet(file).start_array(array_index, dimensions, attributes)

def put_model_arrayset_data(database, model, name, hyperchunks):
  slycat.web.server.update_model(database, model, message="Storing data to array set %s." % (name))

  if isinstance(hyperchunks, tuple):
    hyperchunks = [hyperchunks]
  hyperchunks = [(array, attribute, hyperslices if isinstance(hyperslices, list) else [hyperslices], data if isinstance(data, list) else [data]) for array, attribute, hyperslices, data in hyperchunks]

  with slycat.web.server.database.hdf5.open(model["artifact:%s" % name], "r+") as file:
    for array, attribute, hyperslices, data in hyperchunks:
      hdf5_array = slycat.hdf5.ArraySet(file)[array]
      stored_type = slycat.hdf5.dtype(hdf5_array.attributes[attribute]["type"])

      for hyperslice, data_hyperslice in zip(hyperslices, data):
        cherrypy.log.error("Writing to arrayset %s array %s attribute %s hyperslice %s" % (name, array, attribute, hyperslice))
        if isinstance(data_hyperslice, list):
          data_hyperslice = numpy.array(data_hyperslice, dtype=stored_type)

        hdf5_array.set_data(attribute, hyperslice, data_hyperslice)

def put_model_file(database, model, name, value, content_type, input=False):
  fid = database.write_file(model, content=value, content_type=content_type)
  model = database[model["_id"]] # This is a workaround for the fact that put_attachment() doesn't update the revision number for us.
  model["artifact:%s" % name] = fid
  model["artifact-types"][name] = "file"
  if input:
    model["input-artifacts"] = list(set(model["input-artifacts"] + [name]))
  database.save(model)
  return model

def put_model_parameter(database, model, name, value, input=False):
  model["artifact:%s" % name] = value
  model["artifact-types"][name] = "json"
  if input:
    model["input-artifacts"] = list(set(model["input-artifacts"] + [name]))
  database.save(model)

