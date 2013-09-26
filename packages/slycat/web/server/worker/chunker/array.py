# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import slycat.web.server.database.couchdb
import slycat.web.server.database.scidb
import slycat.web.server.worker

import cherrypy
import itertools
import json
import numpy
import operator
import sys
import threading
import time

class prototype(slycat.web.server.worker.prototype):
  """Worker that provides interactive browsing of giant multidimensional arrays."""
  def __init__(self, security, name):
    slycat.web.server.worker.prototype.__init__(self, security, name)

  def get_array_chunker_metadata(self, arguments):
    """Called to retrieve metadata describing the underlying array."""
    response = self.get_metadata()
    if isinstance(response, cherrypy.HTTPError):
      raise response
    return response

  def get_array_chunker_chunk(self, arguments):
    """Called to retrieve the given chunk (hypercube).  Note that the returned chunk may
    contain a subset of the requested data, or no data at all."""
    try:
      attribute = int(arguments["attribute"])
    except:
      raise cherrypy.HTTPError("400 Malformed attribute argument must be a zero-based integer attribute index.")

    try:
      ranges = [int(spec) for spec in arguments["ranges"].split(",")]
      i = iter(ranges)
      ranges = list(itertools.izip(i, i))
    except:
      raise cherrypy.HTTPError("400 Malformed ranges argument must be a comma separated collection of half-open index ranges.")

    if "byteorder" in arguments:
      accept = cherrypy.lib.cptools.accept(["application/octet-stream"])

      byteorder = arguments["byteorder"]
      if byteorder not in ["little", "big"]:
        raise cherrypy.HTTPError("400 Malformed byteorder argument must be 'little' or 'big'.")

      response = self.get_chunk(attribute, ranges, byteorder)
    else:
      accept = cherrypy.lib.cptools.accept(["application/json"])
      response = self.get_string_chunk(attribute, ranges)

    if isinstance(response, cherrypy.HTTPError):
      raise response
    cherrypy.response.headers["content-type"] = accept
    return response

  def work(self):
    self.preload()
    while not self.stopped:
      time.sleep(1.0)

  def preload(self):
    """Implement this in derivatives to do any pre-loading of data before entering the main chunk-retrieval loop."""
    raise NotImplementedError()

  def get_metadata(self):
    """Implement this in derivatives to return metadata describing the underlying data."""
    raise NotImplementedError()

  def get_chunk(self, attribute, ranges, byteorder):
    """Implement this in derivatives to fetch the given chunk."""
    raise NotImplementedError()

  def get_string_chunk(self, attribute, ranges):
    """Implement this in derivatives to fetch the given chunk."""
    raise NotImplementedError()

class test(prototype):
  """Array chunker that creates an arbitrary-size array containing a range of integer values for testing."""
  def __init__(self, security, shape):
    prototype.__init__(self, security, "chunker.array.test")
    self.shape = shape
    self.types = ["int8", "int16", "int32", "int64", "uint8", "uint16", "uint32", "uint64", "float32", "float64", "string"]
    self.ready = threading.Event()

  def preload(self):
    count = numpy.array(self.shape).prod()
    self.data = [numpy.arange(count).reshape(self.shape).astype(type) for type in self.types]
    self.set_message("Using %s test data." % (" x ".join([str(size) for size in self.shape])))
    self.ready.set()

  def get_metadata(self):
    self.ready.wait()
    response = {
      "dimensions" : [{"name" : "d%s" % index, "type" : "int64", "begin" : 0, "end" : size} for index, size in enumerate(self.shape)],
      "attributes" : [{"name" : type, "type" : type} for index, type in enumerate(self.types)]
      }
    return response

  def get_chunk(self, attribute, ranges, byteorder):
    self.ready.wait()
    if attribute < 0 or attribute >= len(self.data):
      return cherrypy.HTTPError("400 Attribute out-of-range.")

    if len(ranges) != len(self.shape):
      return cherrypy.HTTPError("400 Malformed ranges argument must contain two values [begin, end) for each dimension in the array.")

    # Constrain ranges to the dimensions of our data ...
    ranges = [(min(size, max(0, begin)), min(size, max(min(size, max(0, begin)), end))) for (begin, end), size in zip(ranges, self.shape)]

    data = self.data[attribute][[slice(begin, end) for begin, end in ranges]]

    # Handle byte ordering issues ...
    if sys.byteorder != byteorder:
      result = data.byteswap().tostring(order="C")
    else:
      result = data.tostring(order="C")

    return result

  def get_string_chunk(self, attribute, ranges):
    self.ready.wait()
    if attribute < 0 or attribute >= len(self.data):
      return cherrypy.HTTPError("400 Attribute out-of-range.")

    if len(ranges) != len(self.shape):
      return cherrypy.HTTPError("400 Malformed ranges argument must contain two values [begin, end) for each dimension in the array.")

    # Constrain ranges to the dimensions of our data ...
    ranges = [(min(size, max(0, begin)), min(size, max(min(size, max(0, begin)), end))) for (begin, end), size in zip(ranges, self.shape)]
    data = self.data[attribute][[slice(begin, end) for begin, end in ranges]]

    return json.dumps(data.tolist())

class artifact(prototype):
  """Array chunker that returns data from a model artifact."""
  def __init__(self, security, model, artifact):
    prototype.__init__(self, security, "chunker.array.artifact")
    self.model = model
    self.artifact = model["artifact:%s" % artifact]
    self.ready = threading.Event()

  def preload(self):
    database = slycat.web.server.database.scidb.connect()

    attribute_names = self.artifact["attribute-names"]
    dimension_names = self.artifact["dimension-names"]
    data = self.artifact["data"]

    with database.query("aql", "select name from %s" % attribute_names) as results:
      self.attribute_names = [value.getString() for attribute in results for value in attribute]

    with database.query("aql", "select type_id from attributes(%s)" % data) as results:
      self.attribute_types = [value.getString() for attribute in results for value in attribute]

    with database.query("aql", "select name from %s" % dimension_names) as results:
      self.dimension_names = [value.getString() for attribute in results for value in attribute]

    with database.query("aql", "select type, low as begin, high + 1 as end from dimensions(%s)" % data) as results:
      attribute = iter(results)
      self.dimension_types = [value.getString() for value in attribute.next()]
      self.dimension_begin = [value.getInt64() for value in attribute.next()]
      self.dimension_end = [value.getInt64() for value in attribute.next()]

    # SciDB uses "float" and "double", but we prefer "float32" and "float64"
    type_map = {"float":"float32", "double":"float64"}
    self.attribute_types = [type_map[type] if type in type_map else type for type in self.attribute_types]
    self.dimension_types = [type_map[type] if type in type_map else type for type in self.dimension_types]

    self.data = [None for attribute in self.attribute_names]

    self.set_message("Loaded %s %s attributes." % (len(self.data), " x ".join([str(end - begin) for begin, end in zip(self.dimension_begin, self.dimension_end)])))
    self.ready.set()

  def load_data(self, attribute):
    if self.data[attribute] is not None:
      return

    database = slycat.web.server.database.scidb.connect()

    type = self.attribute_types[attribute]
    self.data[attribute] = numpy.zeros([end - begin for begin, end in zip(self.dimension_begin, self.dimension_end)], dtype=type)
    iterator = numpy.nditer(self.data[attribute], order="C", op_flags=["readwrite"])
    with database.query("aql", "select a%s from %s" % (attribute, self.artifact["data"])) as result:
      for chunk in result.chunks():
        for chunk_attribute in chunk.attributes():
          if type == "float64":
            for value in chunk_attribute:
              iterator.next()[...] = value.getDouble()
          elif type == "float32":
            for value in chunk_attribute:
              iterator.next()[...] = value.getFloat()
          elif type == "int64":
            for value in chunk_attribute:
              iterator.next()[...] = value.getInt64()
          elif type == "int32":
            for value in chunk_attribute:
              iterator.next()[...] = value.getInt32()
          elif type == "int16":
            for value in chunk_attribute:
              iterator.next()[...] = value.getInt16()
          elif type == "int8":
            for value in chunk_attribute:
              iterator.next()[...] = value.getInt8()
          elif type == "uint64":
            for value in chunk_attribute:
              iterator.next()[...] = value.getUint64()
          elif type == "uint32":
            for value in chunk_attribute:
              iterator.next()[...] = value.getUint32()
          elif type == "uint16":
            for value in chunk_attribute:
              iterator.next()[...] = value.getUint16()
          elif type == "uint8":
            for value in chunk_attribute:
              iterator.next()[...] = value.getUint8()

  def get_metadata(self):
    self.ready.wait()
    response = {
      "attributes" : [{"name" : name, "type" : type} for name, type in zip(self.attribute_names, self.attribute_types)],
      "dimensions" : [{"name" : name, "type" : type, "begin" : begin, "end" : end} for name, type, begin, end in zip(self.dimension_names, self.dimension_types, self.dimension_begin, self.dimension_end)]
      }
    return response

  def get_chunk(self, attribute, ranges, byteorder):
    self.ready.wait()
    if attribute < 0 or attribute >= len(self.data):
      return cherrypy.HTTPError("400 Attribute out-of-range.")

    if len(ranges) != len(self.dimension_names):
      return cherrypy.HTTPError("400 Malformed ranges argument must contain two values [begin, end) for each dimension in the array.")

    self.load_data(attribute)

    # Constrain ranges to the dimensions of our data ...
    ranges = [(min(size, max(0, begin)), min(size, max(min(size, max(0, begin)), end))) for (begin, end), size in zip(ranges, self.data[attribute].shape)]

    data = self.data[attribute][[slice(begin, end) for begin, end in ranges]]

    # Handle byte ordering issues ...
    if sys.byteorder != byteorder:
      result = data.byteswap().tostring(order="C")
    else:
      result = data.tostring(order="C")

    return result

  def get_string_chunk(self, attribute, ranges):
    self.ready.wait()
    if attribute < 0 or attribute >= len(self.data):
      return cherrypy.HTTPError("400 Attribute out-of-range.")

    if len(ranges) != len(self.dimension_names):
      return cherrypy.HTTPError("400 Malformed ranges argument must contain two values [begin, end) for each dimension in the array.")

    self.load_data(attribute)

    # Constrain ranges to the dimensions of our data ...
    ranges = [(min(size, max(0, begin)), min(size, max(min(size, max(0, begin)), end))) for (begin, end), size in zip(ranges, self.data[attribute].shape)]

    data = self.data[attribute][[slice(begin, end) for begin, end in ranges]]
    return json.dumps(data.tolist())

class table_artifact(prototype):
  """Array chunker that returns data from a model table artifact."""
  def __init__(self, security, model, artifact):
    prototype.__init__(self, security, "chunker.array.table_artifact")
    self.model = model
    self.artifact = model["artifact:%s" % artifact]
    self.ready = threading.Event()

  def preload(self):
    database = slycat.web.server.database.scidb.connect()

    column_names = self.artifact["column-names"]
    columns = self.artifact["columns"]

    with database.query("aql", "select name from %s" % column_names) as results:
      self.attribute_names = [value.getString() for attribute in results for value in attribute]

    with database.query("aql", "select type_id from attributes(%s)" % columns) as results:
      self.attribute_types = [value.getString() for attribute in results for value in attribute]

    with database.query("aql", "select name, type, low as begin, high + 1 as end from dimensions(%s)" % columns) as results:
      attribute = iter(results)
      self.dimension_names = [value.getString() for value in attribute.next()]
      self.dimension_types = [value.getString() for value in attribute.next()]
      self.dimension_begin = [value.getInt64() for value in attribute.next()]
      self.dimension_end = [value.getInt64() for value in attribute.next()]

    # SciDB uses "float" and "double", but we prefer "float32" and "float64"
    type_map = {"float":"float32", "double":"float64"}
    self.attribute_types = [type_map[type] if type in type_map else type for type in self.attribute_types]
    self.dimension_types = [type_map[type] if type in type_map else type for type in self.dimension_types]

    self.data = [None for name in self.attribute_names]

    self.set_message("Loaded %s %s attributes." % (len(self.data), " x ".join([str(end - begin) for begin, end in zip(self.dimension_begin, self.dimension_end)])))
    self.ready.set()

  def load_data(self, attribute):
    if self.data[attribute] is not None:
      return

    database = slycat.web.server.database.scidb.connect()

    if self.attribute_types[attribute] == "string":
      with database.query("aql", "select c%s from %s" % (attribute, self.artifact["columns"])) as result:
        self.data[attribute] = [value.getString() for chunk in result.chunks() for chunk_attribute in chunk.attributes() for value in chunk_attribute]
    else:
      self.data[attribute] = numpy.zeros([end - begin for begin, end in zip(self.dimension_begin, self.dimension_end)])
      iterator = numpy.nditer(self.data[attribute], order="C", op_flags=["readwrite"])
      with database.query("aql", "select c%s from %s" % (attribute, self.artifact["columns"])) as result:
        for chunk in result.chunks():
          for chunk_attribute in chunk.attributes():
            for value in chunk_attribute:
              iterator.next()[...] = value.getDouble() # Assume all doubles for now.  Yes, this is a hack.

  def get_metadata(self):
    self.ready.wait()
    response = {
      "attributes" : [{"name" : name, "type" : type} for name, type in zip(self.attribute_names, self.attribute_types)],
      "dimensions" : [{"name" : name, "type" : type, "begin" : begin, "end" : end} for name, type, begin, end in zip(self.dimension_names, self.dimension_types, self.dimension_begin, self.dimension_end)]
      }
    return response

  def get_chunk(self, attribute, ranges, byteorder):
    self.ready.wait()

    if attribute < 0 or attribute >= len(self.data):
      return cherrypy.HTTPError("400 Attribute out-of-range.")

    if len(ranges) != 1:
      return cherrypy.HTTPError("400 Malformed ranges argument must contain two values [begin, end).")

    self.load_data(attribute)

    # Constrain ranges to the dimensions of our data ...
    ranges = [(min(size, max(0, begin)), min(size, max(min(size, max(0, begin)), end))) for (begin, end), size in zip(ranges, self.data[attribute].shape)]

    data = self.data[attribute][[slice(begin, end) for begin, end in ranges]]

    # Handle byte ordering issues ...
    if sys.byteorder != byteorder:
      result = data.byteswap().tostring(order="C")
    else:
      result = data.tostring(order="C")

    return result

  def get_string_chunk(self, attribute, ranges):
    self.ready.wait()

    if attribute < 0 or attribute >= len(self.data):
      return cherrypy.HTTPError("400 Attribute out-of-range.")

    if len(ranges) != 1:
      return cherrypy.HTTPError("400 Malformed ranges argument must contain two values [begin, end).")

    self.load_data(attribute)

    # Constrain ranges to the dimensions of our data ...
    ranges = [(min(size, max(0, begin)), min(size, max(min(size, max(0, begin)), end))) for (begin, end), size in zip(ranges, self.data[0].shape)]

    data = self.data[attribute][[slice(begin, end) for begin, end in ranges]]
    return json.dumps(data.tolist())

