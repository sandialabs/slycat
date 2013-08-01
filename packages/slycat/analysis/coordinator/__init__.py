# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import ast
import logging
import numpy
import os
import Pyro4
from slycat.analysis.api import InvalidArgument

handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))

log = logging.getLogger("slycat.analysis.coordinator")
log.setLevel(logging.DEBUG)
log.addHandler(handler)

class pyro_object(object):
  """Provides some standardized functionality for objects that are exported via Pyro4."""
  def __init__(self):
    self.refcount = 1
  def __del__(self):
    if self.refcount != 0:
      log.error("Deleting object with nonzero reference count: %s", self)
    #log.debug("Deleted %s", self)
  def register(self):
    self.refcount += 1
  def release(self):
    self.refcount = max(0, self.refcount - 1)
    if self.refcount == 0:
      log.debug("Releasing %s %s", self._pyroId, self)
      self._pyroDaemon.unregister(self)
  def pyro_register(self, thing):
    """Register a Python object to be shared via Pyro."""
    self._pyroDaemon.register(thing)
    log.debug("Registered %s %s", thing._pyroId, thing)
    return thing

class factory(pyro_object):
  """Top-level factory for coordinator objects."""
  def __init__(self, nameserver):
    pyro_object.__init__(self)
    self.nameserver = nameserver
  def shutdown(self):
    log.info("Client requested shutdown.")
    self._pyroDaemon.shutdown()

  def workers(self):
    """Returns the set of available slycat analysis workers."""
    return [Pyro4.Proxy(self.nameserver.lookup(worker)) for worker in self.nameserver.list(prefix="slycat.worker").keys()]

  def require_attribute_name(self, name):
    if not isinstance(name, basestring):
      raise InvalidArgument("attribute name must be a string.")
    return name
  def require_attribute(self, attribute):
    if isinstance(attribute, basestring):
      attribute = {"name":attribute, "type":"float64"}
    elif isinstance(attribute, tuple):
      if len(attribute) != 2:
        raise InvalidArgument("attribute should have a name and a type.")
      attribute = {"name":attribute[0], "type":attribute[1]}
    elif isinstance(attribute, dict):
      if "name" not in attribute:
        raise InvalidArgument("attribute missing name.")
      if "type" not in attribute:
        raise InvalidArgument("attribute missing type.")
    if not isinstance(attribute["name"], basestring):
      raise InvalidArgument("attribute name must be a string.")
    self.require_type(attribute["type"])
    return attribute
  def require_attributes(self, attributes):
    attributes = [self.require_attribute(attribute) for attribute in attributes]
    if not len(attributes):
      raise InvalidArgument("Array must have at least one attribute.")
    return attributes
  def require_chunk_size(self, chunk_size):
    if not isinstance(chunk_size, int):
      raise InvalidArgument("Chunk size must be an integer.")
    return chunk_size
  def require_chunk_sizes(self, shape, chunk_sizes):
    """Return array chunk sizes (tuple of dimension lengths), treating a single integer as a 1-tuple and sanity-checking the results against an array shape."""
    if chunk_sizes is None:
      chunk_sizes = shape
    elif isinstance(chunk_sizes, int):
      chunk_sizes = tuple([chunk_sizes])
    else:
      chunk_sizes = tuple(chunk_sizes)
    if len(shape) != len(chunk_sizes):
      raise InvalidArgument("Array shape and chunk sizes must contain the same number of dimensions.")
    return chunk_sizes
  def require_dimension(self, dimension):
    if isinstance(dimension, basestring):
      dimension = {"name":dimension, "type":"int64"}
    return dimension
  def require_dimensions(self, dimensions):
    dimensions = [self.require_dimension(dimension) for dimension in dimensions]
    if not len(dimensions):
      raise InvalidArgument("Array must have at least one dimension.")
    return dimensions
  def require_expression(self, expression):
    if isinstance(expression, basestring):
      expression = ast.parse(expression)
    return expression
  def require_object(self, uri):
    """Lookup a Pyro URI, returning the corresponding Python object."""
    return self._pyroDaemon.objectsById[uri.asString().split(":")[1].split("@")[0]]
  def require_shape(self, shape):
    """Return an array shape (tuple of dimension lengths), treating a single integer as a 1-tuple."""
    if isinstance(shape, int):
      shape = tuple([shape])
    else:
      shape = tuple(shape)
    if not len(shape):
      raise InvalidArgument("Array shape must have at least one dimension.")
    return shape
  def require_type(self, type):
    allowed_types = ["int8", "int16", "int32", "int64", "uint8", "uint16", "uint32", "uint64", "float32", "float64", "string"]
    if type not in allowed_types:
      raise InvalidArgument("Type must be one of %s" % ",".join(allowed_types))
    return type

  def aggregate(self, source, expressions):
    source = self.require_object(source)
    expressions = [self.require_expression(expression) for expression in expressions]
    expressions = [(expression.body[0].value.func.id, expression.body[0].value.args[0].id) for expression in expressions]
    array_workers = []
    for worker_index, (source_proxy, worker) in enumerate(zip(source.workers, self.workers())):
      array_workers.append(worker.aggregate(worker_index, source_proxy._pyroUri, expressions))
    return self.pyro_register(array(array_workers, [source]))
  def apply(self, source, attribute, expression):
    source = self.require_object(source)
    attribute = self.require_attribute(attribute)
    expression = self.require_expression(expression)
    array_workers = []
    for worker_index, (source_proxy, worker) in enumerate(zip(source.workers, self.workers())):
      array_workers.append(worker.apply(worker_index, source_proxy._pyroUri, attribute, expression))
    return self.pyro_register(array(array_workers, [source]))
  def array(self, initializer, type):
    type = self.require_type(type)
    array_workers = []
    for worker_index, worker in enumerate(self.workers()):
      array_workers.append(worker.array(worker_index, initializer, type))
    return self.pyro_register(array(array_workers, []))
  def attributes(self, source):
    source = self.require_object(source)
    array_workers = []
    for worker_index, (source_proxy, worker) in enumerate(zip(source.workers, self.workers())):
      array_workers.append(worker.attributes(worker_index, source_proxy._pyroUri))
    return self.pyro_register(array(array_workers, [source]))
  def attribute_rename(self, source, attributes):
    source = self.require_object(source)
    array_workers = []
    for worker_index, (source_proxy, worker) in enumerate(zip(source.workers, self.workers())):
      array_workers.append(worker.attribute_rename(worker_index, source_proxy._pyroUri, attributes))
    return self.pyro_register(array(array_workers, [source]))
  def chunk_map(self, source):
    source = self.require_object(source)
    array_workers = []
    for worker_index, (source_proxy, worker) in enumerate(zip(source.workers, self.workers())):
      array_workers.append(worker.chunk_map(worker_index, source_proxy._pyroUri))
    return self.pyro_register(array(array_workers, [source]))
  def dimensions(self, source):
    source = self.require_object(source)
    array_workers = []
    for worker_index, (source_proxy, worker) in enumerate(zip(source.workers, self.workers())):
      array_workers.append(worker.dimensions(worker_index, source_proxy._pyroUri))
    return self.pyro_register(array(array_workers, [source]))
  def join(self, array1, array2):
    array1 = self.require_object(array1)
    array2 = self.require_object(array2)

    dimensions1 = [{"type":dimension["type"], "begin":dimension["begin"], "end":dimension["end"], "chunk-size":dimension["chunk-size"]} for dimension in array1.dimensions()]
    dimensions2 = [{"type":dimension["type"], "begin":dimension["begin"], "end":dimension["end"], "chunk-size":dimension["chunk-size"]} for dimension in array2.dimensions()]
    if dimensions1 != dimensions2:
      raise InvalidArgument("Arrays to be joined must have identical dimensions.")

    array_workers = []
    for worker_index, (array1_proxy, array2_proxy, worker) in enumerate(zip(array1.workers, array2.workers, self.workers())):
      array_workers.append(worker.join(worker_index, array1_proxy._pyroUri, array2_proxy._pyroUri))
    return self.pyro_register(array(array_workers, [array1, array2]))
  def load(self, path, schema, **keywords):
    if schema == "csv-file":
      chunk_size = self.require_chunk_size(keywords["chunk_size"])
      format = keywords.get("format", None)
      array_workers = []
      for worker_index, worker in enumerate(self.workers()):
        array_workers.append(worker.csv_file(worker_index, path, chunk_size, format))
      return self.pyro_register(file_array(array_workers, []))
    elif schema == "prn-file":
      chunk_size = keywords["chunk_size"]
      array_workers = []
      for worker_index, worker in enumerate(self.workers()):
        array_workers.append(worker.prn_file(worker_index, path, chunk_size))
      return self.pyro_register(file_array(array_workers, []))
    else:
      raise InvalidArgument("Unknown load schema: %s" % schema)
  def materialize(self, source):
    source = self.require_object(source)
    array_workers = []
    for worker_index, (source_proxy, worker) in enumerate(zip(source.workers, self.workers())):
      array_workers.append(worker.materialize(worker_index, source_proxy._pyroUri))
    return self.pyro_register(array(array_workers, [source]))
  def project(self, source, attributes):
    source = self.require_object(source)
    if not len(attributes):
      raise InvalidArgument("project() operator requires at least one attribute.")
    array_workers = []
    for worker_index, (source_proxy, worker) in enumerate(zip(source.workers, self.workers())):
      array_workers.append(worker.project(worker_index, source_proxy._pyroUri, attributes))
    return self.pyro_register(array(array_workers, [source]))
  def random(self, shape, chunk_sizes, seed, attribute):
    shape = self.require_shape(shape)
    chunk_sizes = self.require_chunk_sizes(shape, chunk_sizes)
    attribute = self.require_attribute_name(attribute)
    array_workers = []
    for worker_index, worker in enumerate(self.workers()):
      array_workers.append(worker.random(worker_index, shape, chunk_sizes, seed, attribute))
    return self.pyro_register(array(array_workers, []))
  def redimension(self, source, dimensions, attributes):
    source = self.require_object(source)
    array_workers = []
    for worker_index, (source_proxy, worker) in enumerate(zip(source.workers, self.workers())):
      array_workers.append(worker.redimension(worker_index, source_proxy._pyroUri, dimensions, attributes))
    return self.pyro_register(array(array_workers, [source]))
  def zeros(self, shape, chunk_sizes, attribute):
    shape = self.require_shape(shape)
    chunk_sizes = self.require_chunk_sizes(shape, chunk_sizes)
    attribute = self.require_attribute_name(attribute)
    array_workers = []
    for worker_index, worker in enumerate(self.workers()):
      array_workers.append(worker.zeros(worker_index, shape, chunk_sizes, attribute))
    return self.pyro_register(array(array_workers, []))

class array(pyro_object):
  """Abstract interface for a remote, multi-attribute, multi-dimensional array."""
  def __init__(self, workers, sources):
    pyro_object.__init__(self)
    self.workers = workers
    self.sources = sources
    for worker in workers:
      worker.set_siblings(workers)
    for source in sources:
      source.register()
  def __del__(self):
    for source in self.sources:
      source.release()
    for proxy in self.workers:
      proxy.release()
    pyro_object.__del__(self)
  def dimensions(self):
    return self.workers[0].dimensions()
  def attributes(self):
    return self.workers[0].attributes()
  def iterator(self):
    return self.pyro_register(parallel_remote_array_iterator(self.workers))

class file_array(array):
  """Abstract interface for an array backed by a filesystem file."""
  def __init__(self, workers, sources):
    array.__init__(self, workers, sources)
  def file_path(self):
    return self.workers[0].file_path()
  def file_size(self):
    return self.workers[0].file_size()

class array_iterator(pyro_object):
  """Abstract interface for iterating over an array one chunk (hypercube) at a time."""
  def __init__(self):
    pyro_object.__init__(self)
  def next(self):
    """Advances the iterator to the next chunk.  Raises StopIteration if there are no more chunks."""
    raise NotImplementedError()
  def coordinates(self):
    """Returns the lowest-numbered coordinates along each dimension of the current chunk."""
    raise NotImplementedError()
  def shape(self):
    """Returns the shape (size along each dimension) of the current chunk."""
    raise NotImplementedError()
  def values(self, attribute):
    """Returns the array values for the given attribute index as a dense NumPy array."""
    raise NotImplementedError()

class serial_remote_array_iterator(array_iterator):
  """Concrete array_iterator implementation that retrieves data from remote workers in a naive, serialized order."""
  def __init__(self, workers):
    array_iterator.__init__(self)
    self.iterators = [proxy.iterator() for proxy in workers]
    self.index = 0
  def __del__(self):
    for proxy in self.iterators:
      proxy.release()
    array_iterator.__del__(self)
  def next(self):
    while self.index != len(self.iterators):
      try:
        self.iterator = self.iterators[self.index]
        self.iterator.next()
        return
      except StopIteration:
        self.index += 1
    raise StopIteration()
  def coordinates(self):
    return self.iterator.coordinates()
  def shape(self):
    return self.iterator.shape()
  def values(self, attribute):
    log.debug("Retrieving chunk from remote iterator %s.", self.iterator._pyroUri)
    return self.iterator.values(attribute)

class parallel_remote_array_iterator(array_iterator):
  """Concrete array_iterator implementation that retrieves data from remote workers in parallel, asynchronous order."""
  def __init__(self, workers):
    array_iterator.__init__(self)
    self.iterators = [proxy.iterator() for proxy in workers]
    self.available = [iterator for iterator in self.iterators]
    self.running = []
    self.complete = []
    self.iterator = None
  def __del__(self):
    for proxy in self.iterators:
      proxy.release()
    array_iterator.__del__(self)
  def next(self):
    # Advance available iterators so they can start computing ...
    for iterator in self.available:
      self.running.append((iterator, Pyro4.async(iterator).next()))
    self.available = []

    # If we don't have any complete iterators, wait until we get some ...
    if not len(self.complete) and len(self.running):
      iterator, result = self.running.pop(0)
      try:
        ignored = result.value
        self.complete.append(iterator)
      except StopIteration:
        pass

    # If we don't have any complete iterators at this point, we're done ...
    if not len(self.complete):
      raise StopIteration()

    # Pick a complete iterator to use, and mark it as available next time we're called ...
    self.iterator = self.complete.pop(0)
    self.available.append(self.iterator)

  def coordinates(self):
    return self.iterator.coordinates()
  def shape(self):
    return self.iterator.shape()
  def values(self, attribute):
    log.debug("Retrieving chunk from remote iterator %s.", self.iterator._pyroUri)
    return self.iterator.values(attribute)
