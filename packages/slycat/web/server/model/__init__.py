# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import h5py
import json
import numpy
import slycat.array
import slycat.web.server.database.hdf5
import slycat.web.server.spider
import sys
import threading
import uuid

# Keep track of model revisions
revision = 0
# Create a condition variable used to signal observers whenever a model is updated.
updated = threading.Condition()

def update(database, model, **kwargs):
  """Update the model, and signal any waiting threads that it's changed."""
  for name, value in kwargs.items():
    if name in ["state", "result", "started", "finished", "progress", "message", "uri"]:
      model[name] = value

  database.save(model)

  global updated, revision
  with updated:
    revision += 1
    updated.notify_all()

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
  for name in source["input-artifacts"]:
#    self.set_message("Copying existing model input %s." % name)
#    cherrypy.log.error("Copying artifact %s" % name)
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
  #self.set_message("Loading table %s." % name)
  tables = [perspective for perspective in slycat.web.server.spider.extract(type="table", content=data, filename=filename, nan_row_filtering=nan_row_filtering) if perspective["type"] == "table"]
  if len(tables) != 1:
    raise cherrypy.HTTPError("400 Uploaded file %s must contain exactly one table." % file.filename)
  table = tables[0]
  attributes = zip(table["column-names"], [slycat.array.attribute_type_map[type] for type in table["column-types"]])
  dimensions = [("row", "int64", 0, table["row-count"])]

  start_array_set(database, model, name, input)
  start_array(database, model, name, 0, attributes, dimensions)
  for attribute, data in enumerate(table["columns"]):
    store_array_attribute(database, model, name, 0, attribute, [(0, len(data))], data)
  #self.set_message("Loaded table %s." % name)

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
  storage = uuid.uuid4().hex
  with slycat.web.server.database.hdf5.create(storage) as file:
    database.save({"_id" : storage, "type" : "hdf5"})
    model["artifact:%s" % name] = storage
    model["artifact-types"][name] = "hdf5"
    if input:
      model["input-artifacts"] = list(set(model["input-artifacts"] + [name]))
    database.save(model)

def start_array(database, model, name, array_index, attributes, dimensions):
  storage = model["artifact:%s" % name]
  attributes = slycat.array.require_attributes(attributes)
  dimensions = slycat.array.require_dimensions(dimensions)
  stored_types = [slycat.web.server.database.hdf5.dtype(attribute["type"]) for attribute in attributes]
  shape = [dimension["end"] - dimension["begin"] for dimension in dimensions]

  # Allocate space for the coming data ...
  with slycat.web.server.database.hdf5.open(storage, "r+") as file:
    for attribute_index, stored_type in enumerate(stored_types):
      file.create_dataset("array/{}/attribute/{}".format(array_index, attribute_index), shape, dtype=stored_type)

    # Store array metadata ...
    array_metadata = file.array(array_index).attrs
    array_metadata["attribute-names"] = numpy.array([attribute["name"] for attribute in attributes], dtype=h5py.special_dtype(vlen=unicode))
    array_metadata["attribute-types"] = numpy.array([attribute["type"] for attribute in attributes], dtype=h5py.special_dtype(vlen=unicode))
    array_metadata["dimension-names"] = numpy.array([dimension["name"] for dimension in dimensions], dtype=h5py.special_dtype(vlen=unicode))
    array_metadata["dimension-types"] = numpy.array([dimension["type"] for dimension in dimensions], dtype=h5py.special_dtype(vlen=unicode))
    array_metadata["dimension-begin"] = numpy.array([dimension["begin"] for dimension in dimensions], dtype="int64")
    array_metadata["dimension-end"] = numpy.array([dimension["end"] for dimension in dimensions], dtype="int64")

def store_array_attribute(database, model, name, array_index, attribute_index, ranges, data, byteorder=None):
  storage = model["artifact:%s" % name]
  with slycat.web.server.database.hdf5.open(storage, "r+") as file:
    array_metadata = file.array(array_index).attrs
    if not (0 <= attribute_index and attribute_index < len(array_metadata["attribute-names"])):
      raise cherrypy.HTTPError("400 Attribute index {} out-of-range.".format(attribute_index))
    stored_type = slycat.web.server.database.hdf5.dtype(array_metadata["attribute-types"][attribute_index])

    if len(ranges) != len(array_metadata["dimension-begin"]):
      raise cherrypy.HTTPError("400 Expected {} dimensions, got {}.".format(len(array_metadata["dimension-begin"]), len(ranges)))
    for dimension_begin, dimension_end, (range_begin, range_end) in zip(array_metadata["dimension-begin"], array_metadata["dimension-end"], ranges):
      if not (dimension_begin <= range_begin and range_begin <= dimension_end):
        raise cherrypy.HTTPError("400 Begin index {} out-of-range.".format(begin))
      if not (range_begin <= range_end and range_end <= dimension_end):
        raise cherrypy.HTTPError("400 End index {} out-of-range.".format(end))

    # Convert data to an array ...
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

    # Check that the data and range shapes match ...
    if data.shape != tuple([end - begin for begin, end in ranges]):
      raise cherrypy.HTTPError("400 Data and range shapes don't match.")

    # Store the data ...
    attribute = file.array_attribute(array_index, attribute_index)
    index = tuple([slice(begin, end) for begin, end in ranges])
    attribute[index] = data

    # Update attribute min/max statistics ...
    if data.dtype.char not in ["O", "S"]:
      data = data[numpy.invert(numpy.isnan(data))]
    data_min = numpy.asscalar(numpy.min(data)) if len(data) else None
    data_max = numpy.asscalar(numpy.max(data)) if len(data) else None

    attribute_min = attribute.attrs["min"] if "min" in attribute.attrs else None
    attribute_max = attribute.attrs["max"] if "max" in attribute.attrs else None

    if data_min is not None:
      attribute_min = data_min if attribute_min is None else min(data_min, attribute_min)
    if data_max is not None:
      attribute_max = data_max if attribute_max is None else max(data_max, attribute_max)

    if attribute_min is not None:
      attribute.attrs["min"] = attribute_min
    if attribute_max is not None:
      attribute.attrs["max"] = attribute_max

