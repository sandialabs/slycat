# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import numpy
import slycat.hdf5
import slycat.hyperchunks
import slycat.web.server.hdf5
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

def get_model_arrayset_metadata(database, model, name, arrays=None, statistics=None, unique=None):
  # Handle legacy behavior.
  if arrays is None and statistics is None and unique is None:
    with slycat.web.server.hdf5.lock:
      with slycat.web.server.hdf5.open(model["artifact:%s" % name], "r") as file: 
        hdf5_arrayset = slycat.hdf5.ArraySet(file)
        results = []
        for array in sorted(hdf5_arrayset.keys()):
          hdf5_array = hdf5_arrayset[array]
          results.append({
            "array": int(array),
            "index" : int(array),
            "dimensions" : hdf5_array.dimensions,
            "attributes" : hdf5_array.attributes,
            "shape": tuple([dimension["end"] - dimension["begin"] for dimension in hdf5_array.dimensions]),
            })
        return results

  with slycat.web.server.hdf5.lock:
    with slycat.web.server.hdf5.open(model["artifact:%s" % name], "r+") as file: # We have to open the file with writing enabled in case the statistics cache needs to be updated.
      hdf5_arrayset = slycat.hdf5.ArraySet(file)
      results = {}
      if arrays is not None:
        results["arrays"] = []
        for array in slycat.hyperchunks.arrays(arrays, hdf5_arrayset.array_count()):
          hdf5_array = hdf5_arrayset[array.index]
          results["arrays"].append({
            "index" : array.index,
            "dimensions" : hdf5_array.dimensions,
            "attributes" : hdf5_array.attributes,
            "shape": tuple([dimension["end"] - dimension["begin"] for dimension in hdf5_array.dimensions]),
            })
      if statistics is not None:
        results["statistics"] = []
        for array in slycat.hyperchunks.arrays(statistics, hdf5_arrayset.array_count()):
          hdf5_array = hdf5_arrayset[array.index]
          for attribute in array.attributes(len(hdf5_array.attributes)):
            statistics = hdf5_array.get_statistics(attribute.index)
            statistics["array"] = array.index
            statistics["attribute"] = attribute.index
            results["statistics"].append(statistics)
      if unique is not None:
        results["unique"] = []
        for array in slycat.hyperchunks.arrays(unique, hdf5_arrayset.array_count()):
          hdf5_array = hdf5_arrayset[array.index]
          for attribute in array.attributes(len(hdf5_array.attributes)):
            for hyperslice in attribute.hyperslices():
              unique = hdf5_array.get_unique(attribute.index, hyperslice)
              unique["array"] = array.index
              unique["attribute"] = attribute.index
              results["unique"].append(unique)

      return results

def get_model_arrayset_data(database, model, name, hyperchunks):
  with slycat.web.server.hdf5.lock:
    with slycat.web.server.hdf5.open(model["artifact:%s" % name], "r") as file:
      hdf5_arrayset = slycat.hdf5.ArraySet(file)
      for array in slycat.hyperchunks.arrays(hyperchunks, hdf5_arrayset.array_count()):
        hdf5_array = hdf5_arrayset[array.index]
        for attribute in array.attributes(len(hdf5_array.attributes)):
          for hyperslice in attribute.hyperslices():
            if isinstance(attribute.data, slycat.hyperchunks.grammar.AttributeIndex):
              cherrypy.log.error("Reading from %s/%s/%s/%s" % (name, array.index, attribute.data.index, hyperslice))
              data = hdf5_array.get_data(attribute.data.index)[hyperslice]
            elif isinstance(attribute.data, slycat.hyperchunks.grammar.FunctionCall):
              cherrypy.log.error("Reading from %s/%s/%r/%s" % (name, array.index, attribute.data, hyperslice))
              if attribute.data.name == "indices":
                data = numpy.indices(hdf5_array.shape)[attribute.data.args[0]][hyperslice]
              else:
                raise ValueError("Unknown function: %s" % attribute.data.name)
            else:
              raise ValueError()
            yield data

def get_model_parameter(database, model, name):
  return model["artifact:" + name]

def put_model_arrayset(database, model, name, input=False):
  """Start a new model array set artifact."""
  slycat.web.server.update_model(database, model, message="Starting array set %s." % (name))
  storage = uuid.uuid4().hex
  with slycat.web.server.hdf5.lock:
    with slycat.web.server.hdf5.create(storage) as file:
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
  with slycat.web.server.hdf5.lock:
    with slycat.web.server.hdf5.open(storage, "r+") as file:
      slycat.hdf5.ArraySet(file).start_array(array_index, dimensions, attributes)

def put_model_arrayset_data(database, model, name, hyperchunks, data):
  slycat.web.server.update_model(database, model, message="Storing data to array set %s." % (name))

  data = iter(data)

  with slycat.web.server.hdf5.lock:
    with slycat.web.server.hdf5.open(model["artifact:%s" % name], "r+") as file:
      hdf5_arrayset = slycat.hdf5.ArraySet(file)
      for array in slycat.hyperchunks.arrays(hyperchunks, hdf5_arrayset.array_count()):
        hdf5_array = hdf5_arrayset[array.index]
        for attribute in array.attributes(len(hdf5_array.attributes)):
          stored_type = slycat.hdf5.dtype(hdf5_array.attributes[attribute.index]["type"])
          for hyperslice in attribute.hyperslices():
            cherrypy.log.error("Writing to %s/%s/%s/%s" % (name, array.index, attribute.index, hyperslice))

            data_hyperslice = next(data)
            if isinstance(data_hyperslice, list):
              data_hyperslice = numpy.array(data_hyperslice, dtype=stored_type)
            hdf5_array.set_data(attribute.index, hyperslice, data_hyperslice)

def put_model_file(database, model, name, value, content_type, input=False):
  fid = database.write_file(model, content=value, content_type=content_type)
  model = database[model["_id"]] # This is a workaround for the fact that put_attachment() doesn't update the revision number for us.
  model["artifact:%s" % name] = fid
  model["artifact-types"][name] = "file"
  if input:
    model["input-artifacts"] = list(set(model["input-artifacts"] + [name]))
  database.save(model)
  return model

def put_model_inputs(database, model, source):
  slycat.web.server.update_model(database, model, message="Copying existing model inputs.")
  for name in source["input-artifacts"]:
    original_type = source["artifact-types"][name]
    original_value = source["artifact:%s" % name]
    if original_type in ["json", "hdf5"]:
      model["artifact-types"][name] = original_type
      model["artifact:%s" % name] = original_value
      model["input-artifacts"] = list(set(model["input-artifacts"] + [name]))
    else:
      raise Exception("Cannot copy unknown input artifact type %s." & original_type)
  database.save(model)

def put_model_parameter(database, model, name, value, input=False):
  model["artifact:%s" % name] = value
  model["artifact-types"][name] = "json"
  if input:
    model["input-artifacts"] = list(set(model["input-artifacts"] + [name]))
  database.save(model)

