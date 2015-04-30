# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import numbers
import numpy
import os
import shutil
import slycat.hdf5
import slycat.hyperchunks
import slycat.web.server.hdf5
import uuid

config = {}

def mix(a, b, amount):
  """Linear interpolation between two numbers.  Useful for computing model progress."""
  return ((1.0 - amount) * a) + (amount * b)

def evaluate(hdf5_array, expression, expression_type, expression_level = 0):
  """Evaluate a hyperchunk expression."""
  cherrypy.log.error("%sEvaluating %s expression: %s" % ("  " * expression_level, expression_type, slycat.hyperchunks.tostring(expression)))
  if isinstance(expression, int):
    return expression
  elif isinstance(expression, float):
    return expression
  elif isinstance(expression, basestring):
    return expression
  elif isinstance(expression, slycat.hyperchunks.grammar.AttributeIndex):
    return hdf5_array.get_data(expression.index)[...]
  elif isinstance(expression, slycat.hyperchunks.grammar.BinaryOperator):
    left = evaluate(hdf5_array, expression.operands[0], expression_type, expression_level + 1)
    for operand in expression.operands[1:]:
      right = evaluate(hdf5_array, operand, expression_type, expression_level + 1)
      if expression.operator == "<":
        left = left < right
      elif expression.operator == ">":
        left = left > right
      elif expression.operator == "<=":
        left = left <= right
      elif expression.operator == ">=":
        left = left >= right
      elif expression.operator == "==":
        left = left == right
      elif expression.operator == "!=":
        left = left != right
      elif expression.operator == "and":
        left = numpy.logical_and(left, right)
      elif expression.operator == "or":
        left = numpy.logical_or(left, right)
      elif expression.operator == "in":
        left = numpy.in1d(left, right)
      elif expression.operator == "not in":
        left = numpy.in1d(left, right, invert=True)
      else:
        raise ValueError("Unknown operator: %s" % expression.operator)
    return left
  elif isinstance(expression, slycat.hyperchunks.grammar.FunctionCall):
    if expression.name == "index":
      return numpy.indices(hdf5_array.shape)[expression.args[0]]
    elif expression.name == "rank":
      values = evaluate(hdf5_array, expression.args[0], expression_type, expression_level + 1)
      order = numpy.argsort(values)
      if expression.args[1] == "desc":
        order = order[::-1]
      return order
    else:
      raise ValueError("Unknown function: %s" % expression.name)
  elif isinstance(expression, slycat.hyperchunks.grammar.List):
    return expression.values
  else:
    raise ValueError("Unknown expression: %s" % expression)

def update_model(database, model, **kwargs):
  """Update the model, and signal any waiting threads that it's changed."""
  for name, value in kwargs.items():
    if name in ["state", "result", "started", "finished", "progress", "message"]:
      model[name] = value
  database.save(model)

def get_model_arrayset_metadata(database, model, name, arrays=None, statistics=None, unique=None):
  """Retrieve metadata describing an arrayset artifact.

  Parameters
  ----------
  database: database object, required
  model: model object, required
  name: string, required
    Unique (to the model) arrayset artifact name.
  arrays: string or hyperchunks parse tree, optional
    Specifies a collection of arrays, in :ref:`Hyperchunks` format.  Metadata
    describing the specified arrays will be returned in the results.
  statistics: string or hyperchunks parse tree, optional
    Specifies a collection of array attributes, in :ref:`Hyperchunks` format.
    Statistics describing each attribute will be returned in the results.
  unique: string or hyperchunks parse tree, optional
    Specifies a collection of array attributes, in :ref:`Hyperchunks` format.
    Unique values from each attribute will be returned in the results.

  Returns
  -------
  metadata: dict

  See Also
  --------
  :http:get:`/models/(mid)/arraysets/(name)/metadata`
  """
  if isinstance(arrays, basestring):
    arrays = slycat.hyperchunks.parse(arrays)
  if isinstance(statistics, basestring):
    statistics = slycat.hyperchunks.parse(statistics)
  if isinstance(unique, basestring):
    unique = slycat.hyperchunks.parse(unique)

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
            statistics = {}
            statistics["array"] = array.index
            if isinstance(attribute.expression, slycat.hyperchunks.grammar.AttributeIndex):
              statistics["attribute"] = attribute.expression.index
              statistics.update(hdf5_array.get_statistics(attribute.expression.index))
            else:
              values = evaluate(hdf5_array, attribute.expression, "statistics")
              statistics["min"] = values.min()
              statistics["max"] = values.max()
              statistics["unique"] = len(numpy.unique(values))
            results["statistics"].append(statistics)

      if unique is not None:
        results["unique"] = []
        for array in slycat.hyperchunks.arrays(unique, hdf5_arrayset.array_count()):
          hdf5_array = hdf5_arrayset[array.index]
          for attribute in array.attributes(len(hdf5_array.attributes)):
            unique = {}
            unique["array"] = array.index
            unique["values"] = []
            if isinstance(attribute.expression, slycat.hyperchunks.grammar.AttributeIndex):
              for hyperslice in attribute.hyperslices():
                unique["attribute"] = attribute.expression.index
                unique["values"].append(hdf5_array.get_unique(attribute.expression.index, hyperslice)["values"])
            else:
              values = evaluate(hdf5_array, attribute.expression, "uniques")
              for hyperslice in attribute.hyperslices():
                unique["values"].append(numpy.unique(values)[hyperslice])
            results["unique"].append(unique)

      return results

def get_model_arrayset_data(database, model, name, hyperchunks):
  """Read data from an arrayset artifact.

  Parameters
  ----------
  database: database object, required
  model: model object, required
  name: string, required
    Unique (to the model) arrayset artifact name.
  hyperchunks: string or hyperchunks parse tree, required
    Specifies the data to be retrieved, in :ref:`Hyperchunks` format.

  Returns
  -------
  data: sequence of numpy.ndarray data chunks.

  See Also
  --------
  :http:get:`/models/(mid)/arraysets/(name)/data`
  """
  if isinstance(hyperchunks, basestring):
    hyperchunks = slycat.hyperchunks.parse(hyperchunks)

  with slycat.web.server.hdf5.lock:
    with slycat.web.server.hdf5.open(model["artifact:%s" % name], "r") as file:
      hdf5_arrayset = slycat.hdf5.ArraySet(file)
      for array in slycat.hyperchunks.arrays(hyperchunks, hdf5_arrayset.array_count()):
        hdf5_array = hdf5_arrayset[array.index]

        if array.order is not None:
          order = evaluate(hdf5_array, array.order, "order")

        for attribute in array.attributes(len(hdf5_array.attributes)):
          for hyperslice in attribute.hyperslices():
            values = evaluate(hdf5_array, attribute.expression, "attribute")
            if array.order is not None:
              yield values[order][hyperslice]
            else:
              yield values[hyperslice]

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
  """Write data to an arrayset artifact.

  Parameters
  ----------
  database: database object, required
  model: model object, required
  name: string, required
    Unique (to the model) arrayset artifact name.
  hyperchunks: string or hyperchunks parse tree, required
    Specifies where the data will be stored, in :ref:`Hyperchunks` format.
  data: iterable, required)
    A collection of numpy.ndarray data chunks to be stored.  The number of
    data chunks must match the number implied by the `hyperchunks` parameter.

  See Also
  --------
  :http:put:`/models/(mid)/arraysets/(name)/data`
  """
  if isinstance(hyperchunks, basestring):
    hyperchunks = slycat.hyperchunks.parse(hyperchunks)

  data = iter(data)

  slycat.web.server.update_model(database, model, message="Storing data to array set %s." % (name))

  with slycat.web.server.hdf5.lock:
    with slycat.web.server.hdf5.open(model["artifact:%s" % name], "r+") as file:
      hdf5_arrayset = slycat.hdf5.ArraySet(file)
      for array in slycat.hyperchunks.arrays(hyperchunks, hdf5_arrayset.array_count()):
        hdf5_array = hdf5_arrayset[array.index]
        for attribute in array.attributes(len(hdf5_array.attributes)):
          if not isinstance(attribute.expression, slycat.hyperchunks.grammar.AttributeIndex):
            raise ValueError("Cannot write to computed attribute.")
          stored_type = slycat.hdf5.dtype(hdf5_array.attributes[attribute.expression.index]["type"])
          for hyperslice in attribute.hyperslices():
            cherrypy.log.error("Writing to %s/%s/%s/%s" % (name, array.index, attribute.expression.index, hyperslice))

            data_hyperslice = next(data)
            if isinstance(data_hyperslice, list):
              data_hyperslice = numpy.array(data_hyperslice, dtype=stored_type)
            hdf5_array.set_data(attribute.expression.index, hyperslice, data_hyperslice)

def put_model_file(database, model, name, value, content_type, input=False):
  fid = database.write_file(model, content=value, content_type=content_type)
  model = database[model["_id"]] # This is a workaround for the fact that put_attachment() doesn't update the revision number for us.
  model["artifact:%s" % name] = fid
  model["artifact-types"][name] = "file"
  if input:
    model["input-artifacts"] = list(set(model["input-artifacts"] + [name]))
  database.save(model)
  return model

def put_model_inputs(database, model, source, deep_copy=False):
  slycat.web.server.update_model(database, model, message="Copying existing model inputs.")
  for name in source["input-artifacts"]:
    original_type = source["artifact-types"][name]
    original_value = source["artifact:%s" % name]

    if original_type == "json":
      model["artifact:%s" % name] = original_value
    elif original_type == "hdf5":
      if deep_copy:
        new_value = uuid.uuid4().hex
        os.makedirs(os.path.dirname(slycat.web.server.hdf5.path(new_value)))
        with slycat.web.server.hdf5.lock:
          shutil.copy(slycat.web.server.hdf5.path(original_value), slycat.web.server.hdf5.path(new_value))
        model["artifact:%s" % name] = new_value
        database.save({"_id" : new_value, "type" : "hdf5"})
      else:
        model["artifact:%s" % name] = original_value
    else:
      raise Exception("Cannot copy unknown input artifact type %s." % original_type)
    model["artifact-types"][name] = original_type
    model["input-artifacts"] = list(set(model["input-artifacts"] + [name]))

  database.save(model)

def put_model_parameter(database, model, name, value, input=False):
  model["artifact:%s" % name] = value
  model["artifact-types"][name] = "json"
  if input:
    model["input-artifacts"] = list(set(model["input-artifacts"] + [name]))
  database.save(model)

