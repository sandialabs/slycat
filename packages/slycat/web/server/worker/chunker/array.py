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
      ranges = [int(spec) for spec in arguments["ranges"].split(",")]
      i = iter(ranges)
      ranges = list(itertools.izip(i, i))
    except:
      raise cherrypy.HTTPError("400 Malformed ranges argument must be a comma separated collection of half-open index ranges.")

    if "attribute" in arguments:
      accept = cherrypy.lib.cptools.accept(["application/octet-stream"])
      try:
        attribute = int(arguments["attribute"])
      except:
        raise cherrypy.HTTPError("400 Malformed attribute argument must be a zero-based integer attribute index.")

      if "byteorder" not in arguments:
        raise cherrypy.HTTPError("400 Missing required byteorder argument.")

      byteorder = arguments["byteorder"]
      if byteorder not in ["little", "big"]:
        raise cherrypy.HTTPError("400 Malformed byteorder argument must be 'little' or 'big'.")

      response = self.get_binary_chunk(attribute, ranges, byteorder)
    elif "attributes" in arguments:
      accept = cherrypy.lib.cptools.accept(["application/json"])
      try:
        attributes = [int(spec) for spec in arguments["attributes"].split(",")]
      except:
        raise cherrypy.HTTPError("400 Malformed attributes argument must be a comma separated collection of attribute indices.")
      response = self.get_chunk(attributes, ranges)
    else:
      raise cherrypy.HTTPError("400 Chunk request must contain attribute or attributes arguments.")

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

  def get_binary_chunk(self, attribute, ranges, byteorder):
    """Implement this in derivatives to fetch the given chunk."""
    raise NotImplementedError()

  def get_chunk(self, attributes, ranges):
    """Implement this in derivatives to fetch the given chunk."""
    raise NotImplementedError()

class test(prototype):
  """Array chunker that creates an arbitrary-size array containing a range of integer values for testing."""
  def __init__(self, security, shape):
    prototype.__init__(self, security, "chunker.array.test")
    self.shape = shape
    self.ready = threading.Event()

  def preload(self):
    self.data = numpy.arange(reduce(operator.mul, self.shape, 1)).reshape(self.shape).astype("float64")
    self.set_message("Using %s test data." % (" x ".join([str(size) for size in self.shape])))
    self.ready.set()

  def get_metadata(self):
    self.ready.wait()
    response = {
      "dimensions" : [{"name" : "d%s" % index, "type" : "int64", "begin" : 0, "end" : size} for index, size in enumerate(self.shape)],
      "attributes" : [{"name" : "a0", "type" : "float64"}]
      }
    return response

  def get_binary_chunk(self, attribute, ranges, byteorder):
    self.ready.wait()
    if attribute != 0:
      return ""

    if len(ranges) != len(self.shape):
      return cherrypy.HTTPError("400 Malformed ranges argument must contain two values [begin, end) for each dimension in the array.")

    # Constrain ranges to the dimensions of our data ...
    ranges = [(min(size, max(0, begin)), min(size, max(min(size, max(0, begin)), end))) for (begin, end), size in zip(ranges, self.shape)]

    data = self.data[[slice(begin, end) for begin, end in ranges]]

    # Handle byte ordering issues ...
    if sys.byteorder != byteorder:
      result = data.byteswap().tostring(order="C")
    else:
      result = data.tostring(order="C")

    return result

  def get_chunk(self, attributes, ranges):
    self.ready.wait()
    attributes = [attribute for attribute in attributes if attribute == 0]

    if len(ranges) != len(self.shape):
      return cherrypy.HTTPError("400 Malformed ranges argument must contain two values [begin, end) for each dimension in the array.")

    # Constrain ranges to the dimensions of our data ...
    ranges = [(min(size, max(0, begin)), min(size, max(min(size, max(0, begin)), end))) for (begin, end), size in zip(ranges, self.shape)]
    data = self.data[[slice(begin, end) for begin, end in ranges]]

    response = {
      "attributes" : attributes,
      "ranges" : ranges,
      "data" : [data.tolist()]
      }
    return json.dumps(response)

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

    self.data = [numpy.zeros([end - begin for begin, end in zip(self.dimension_begin, self.dimension_end)]) for name in self.attribute_names]
    iterators = [numpy.nditer(attribute, order="C", op_flags=["readwrite"]) for attribute in self.data]
    with database.query("aql", "select * from %s" % data) as result:
      for chunk in result.chunks():
        for iterator, attribute in zip(iterators, chunk.attributes()):
          for value in attribute:
            iterator.next()[...] = value.getDouble() # Assume all doubles for now.  Yes, this is a hack.

    self.set_message("Loaded %s %s attributes." % (len(self.data), " x ".join([str(end - begin) for begin, end in zip(self.dimension_begin, self.dimension_end)])))
    self.ready.set()

  def get_metadata(self):
    self.ready.wait()
    response = {
      "attributes" : [{"name" : name, "type" : type} for name, type in zip(self.attribute_names, self.attribute_types)],
      "dimensions" : [{"name" : name, "type" : type, "begin" : begin, "end" : end} for name, type, begin, end in zip(self.dimension_names, self.dimension_types, self.dimension_begin, self.dimension_end)]
      }
    return response

  def get_binary_chunk(self, attribute, ranges, byteorder):
    self.ready.wait()
    if attribute < 0 or attribute >= len(self.attribute_names):
      return ""

    if len(ranges) != len(self.data[0].shape):
      return cherrypy.HTTPError("400 Malformed ranges argument must contain two values [begin, end) for each dimension in the array.")

    # Constrain ranges to the dimensions of our data ...
    ranges = [(min(size, max(0, begin)), min(size, max(min(size, max(0, begin)), end))) for (begin, end), size in zip(ranges, self.data[0].shape)]

    data = self.data[attribute][[slice(begin, end) for begin, end in ranges]]

    # Handle byte ordering issues ...
    if sys.byteorder != byteorder:
      result = data.byteswap().tostring(order="C")
    else:
      result = data.tostring(order="C")

    return result

  def get_chunk(self, attributes, ranges):
    self.ready.wait()
    attributes = [attribute for attribute in attributes if attribute >= 0 and attribute < len(self.attribute_names)]

    if len(ranges) != len(self.data[0].shape):
      return cherrypy.HTTPError("400 Malformed ranges argument must contain two values [begin, end) for each dimension in the array.")

    # Constrain ranges to the dimensions of our data ...
    ranges = [(min(size, max(0, begin)), min(size, max(min(size, max(0, begin)), end))) for (begin, end), size in zip(ranges, self.data[0].shape)]

    response = {
      "attributes" : attributes,
      "ranges" : ranges,
      "data" : [self.data[attribute][[slice(begin, end) for begin, end in ranges]].tolist() for attribute in attributes]
      }

    return json.dumps(response)

