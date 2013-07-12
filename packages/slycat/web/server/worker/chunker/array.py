# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import slycat.web.server.database.couchdb
import slycat.web.server.database.scidb
import slycat.web.server.worker

import cherrypy
import json
import itertools
import numpy
import operator
import Queue

class prototype(slycat.web.server.worker.prototype):
  """Worker that provides interactive browsing of giant multidimensional arrays."""
  def __init__(self, security, name):
    slycat.web.server.worker.prototype.__init__(self, security, name)
    self.request = Queue.Queue()
    self.response = Queue.Queue()

  def get_array_chunker_metadata(self, arguments):
    """Called to retrieve metadata describing the underlying array."""
    self.request.put(("metadata", None))
    response = self.response.get()
    if isinstance(response, cherrypy.HTTPError):
      raise response
    return response

  def get_array_chunker_chunk(self, arguments):
    """Called to retrieve the given chunk (hypercube).  Note that the returned chunk may
    contain a subset of the requested data, or no data at all."""
    try:
      attributes = [int(spec) for spec in arguments["attributes"].split(",")]
    except:
      raise cherrypy.HTTPError("400 Malformed attributes argument must be a comma separated collection of attribute indices.")

    try:
      ranges = [int(spec) for spec in arguments["ranges"].split(",")]
      i = iter(ranges)
      ranges = list(itertools.izip(i, i))
    except:
      raise cherrypy.HTTPError("400 Malformed ranges argument must be a comma separated collection of half-open index ranges.")

    self.request.put(("chunk", (attributes, ranges)))
    response = self.response.get()
    if isinstance(response, cherrypy.HTTPError):
      raise response
    return response

  def work(self):
    self.preload()

    while not self.stopped:
      try:
        # Process the next request ...
        request, parameters = self.request.get(timeout=1)
        if request == "chunk":
          attributes, ranges = parameters
          response = self.get_chunk(attributes, ranges)

        elif request == "metadata":
          response = self.get_metadata()

        self.response.put(response)

      except Queue.Empty:
        pass

  def preload(self):
    """Implement this in derivatives to do any pre-loading of data before entering the main chunk-retrieval loop."""
    raise NotImplementedError()

  def get_metadata(self):
    """Implement this in derivatives to return metadata describing the underlying data."""
    raise NotImplementedError()

  def get_chunk(self, attributes, ranges):
    """Implement this in derivatives to fetch the given chunk."""
    raise NotImplementedError()

class test(prototype):
  """Array chunker that creates an arbitrary-size array containing random data for testing."""
  def __init__(self, security, shape, seed=12345):
    prototype.__init__(self, security, "chunker.array.test")
    self.shape = shape
    self.seed = seed

  def preload(self):
    numpy.random.seed(self.seed)
    self.data = numpy.arange(reduce(operator.mul, self.shape, 1)).reshape(self.shape)
    self.set_message("Using %s test data." % (" x ".join([str(size) for size in self.shape])))

  def get_metadata(self):
    response = {
      "dimensions" : [{"name" : "d%s" % index, "type" : "int64", "begin" : 0, "end" : size} for index, size in enumerate(self.shape)],
      "attributes" : [{"name" : "a0", "type" : "double"}]
      }
    return response

  def get_chunk(self, attributes, ranges):
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
    return response

class artifact(prototype):
  """Array chunker that returns data from a model artifact."""
  def __init__(self, security, model, artifact):
    prototype.__init__(self, security, "chunker.array.artifact")
    self.model = model
    self.artifact = model["artifact:%s" % artifact]

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

  def get_metadata(self):
    response = {
      "attributes" : [{"name" : name, "type" : type} for name, type in zip(self.attribute_names, self.attribute_types)],
      "dimensions" : [{"name" : name, "type" : type, "begin" : begin, "end" : end} for name, type, begin, end in zip(self.dimension_names, self.dimension_types, self.dimension_begin, self.dimension_end)]
      }
    return response

  def get_chunk(self, attributes, ranges):
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
    return response

