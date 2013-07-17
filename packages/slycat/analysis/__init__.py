# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import logging
import numpy
import Pyro4
import sys
import time

handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))

log = logging.getLogger("slycat.analysis.client")
log.setLevel(logging.DEBUG)
log.addHandler(handler)

Pyro4.config.SERIALIZER = "pickle"

sys.excepthook = Pyro4.util.excepthook

current_coordinator = None

def connect(host="127.0.0.1", port=9090, hmac_key = "slycat1"):
  """Connects with a running Slycat Analysis server."""
  global current_coordinator
  Pyro4.config.HMAC_KEY = hmac_key
  nameserver = Pyro4.locateNS(host, port)
  current_coordinator = coordinator(nameserver)
  return current_coordinator
def get_coordinator():
  if current_coordinator is None:
    connect()
  return current_coordinator
def aggregate(source, expressions):
  return get_coordinator().aggregate(source, expressions)
def apply(source, attribute, expression):
  return get_coordinator().apply(source, attribute, expression)
def array(initializer, type="float64"):
  return get_coordinator().array(initializer, type)
def attributes(source):
  return get_coordinator().attributes(source)
def attribute_rename(source, *attributes):
  return get_coordinator().attribute_rename(source, *attributes)
def chunk_map(source):
  return get_coordinator().chunk_map(source)
def dimensions(source):
  return get_coordinator().dimensions(source)
def load(path, schema, *arguments, **keywords):
  return get_coordinator().load(path, schema, *arguments, **keywords)
def project(source, *attributes):
  return get_coordinator().project(source, *attributes)
def random(shape, chunks=None, seed=12345):
  return get_coordinator().random(shape, chunks, seed)
def redimension(source, dimensions, attributes):
  return get_coordinator().redimension(source, dimensions, attributes)
def scan(source, format="dcsv", stream=sys.stdout):
  return get_coordinator().scan(source, format, stream)
def shutdown():
  return get_coordinator().shutdown()
def value(source, attribute=0):
  return get_coordinator().value(source, attribute)
def values(source, attribute=0):
  return get_coordinator().values(source, attribute)
def workers():
  return get_coordinator().workers()
def zeros(shape, chunks=None):
  return get_coordinator().zeros(shape, chunks)

class coordinator(object):
  def __init__(self, nameserver):
    self.nameserver = nameserver
    self.proxy = Pyro4.Proxy(nameserver.lookup("slycat.coordinator"))
    self.proxy._pyroOneway.add("shutdown")
  def shutdown(self):
    self.proxy.shutdown()
  def aggregate(self, source, expressions):
    return remote_array(self.proxy.aggregate(source.proxy._pyroUri, expressions))
  def apply(self, source, attribute, expression):
    return remote_array(self.proxy.apply(source.proxy._pyroUri, attribute, expression))
  def array(self, initializer, type="float64"):
    return remote_array(self.proxy.array(initializer, type))
  def attributes(self, source):
    return remote_array(self.proxy.attributes(source.proxy._pyroUri))
  def attribute_rename(self, source, *attributes):
    return remote_array(self.proxy.attribute_rename(source.proxy._pyroUri, attributes))
  def chunk_map(self, source):
    return remote_array(self.proxy.chunk_map(source.proxy._pyroUri))
  def dimensions(self, source):
    return remote_array(self.proxy.dimensions(source.proxy._pyroUri))
  def load(self, path, schema, *arguments, **keywords):
    return remote_file_array(self.proxy.load(path, schema, *arguments, **keywords))
  def project(self, source, *attributes):
    return remote_array(self.proxy.project(source.proxy._pyroUri, attributes))
  def random(self, shape, chunks=None, seed=12345):
    return remote_array(self.proxy.random(shape, chunks, seed))
  def redimension(self, source, dimensions, attributes):
    return remote_array(self.proxy.redimension(source.proxy._pyroUri, dimensions, attributes))
  def scan(self, source, format="dcsv", stream=sys.stdout):
    """Formats the array contents to a stream."""
    start_time = time.time()
    if format == "null":
      for chunk in source.chunks():
        for attribute in chunk.attributes():
          values = attribute.values()
    elif format == "csv":
      stream.write(",".join([attribute["name"] for attribute in source.attributes()]))
      stream.write("\n")
      for chunk in source.chunks():
        iterators = [attribute.values().flat for attribute in chunk.attributes()]
        try:
          while True:
            stream.write(",".join([str(iterator.next()) for iterator in iterators]))
            stream.write("\n")
        except StopIteration:
          pass
    elif format == "csv+":
      stream.write(",".join([dimension["name"] for dimension in source.dimensions()] + [attribute["name"] for attribute in source.attributes()]))
      stream.write("\n")
      for chunk in source.chunks():
        chunk_coordinates = chunk.coordinates()
        iterators = [numpy.ndenumerate(attribute.values()) for attribute in chunk.attributes()]
        try:
          while True:
            values = [iterator.next() for iterator in iterators]
            coordinates = chunk_coordinates + values[0][0]
            stream.write(",".join([str(coordinate) for coordinate in coordinates] + [str(value[1]) for value in values]))
            stream.write("\n")
        except StopIteration:
          pass
    elif format == "dcsv":
      stream.write("  {%s} " % ",".join([dimension["name"] for dimension in source.dimensions()]))
      stream.write(",".join([attribute["name"] for attribute in source.attributes()]))
      stream.write("\n")
      for chunk_index, chunk in enumerate(source.chunks()):
        chunk_coordinates = chunk.coordinates()
        iterators = [numpy.ndenumerate(attribute.values()) for attribute in chunk.attributes()]
        try:
          chunk_marker = "* "
          while True:
            values = [iterator.next() for iterator in iterators]
            coordinates = chunk_coordinates + values[0][0]
            stream.write(chunk_marker)
            stream.write("{%s} " % ",".join([str(coordinate) for coordinate in coordinates]))
            stream.write(",".join([str(value[1]) for value in values]))
            stream.write("\n")
            chunk_marker = "  "
        except StopIteration:
          pass
    else:
      raise Exception("Allowed formats: {}".format(", ".join(["null", "csv", "csv+", "dcsv (default)"])))

    log.info("elapsed time: %s seconds" % (time.time() - start_time))
  def value(self, source, attribute=0):
    """Returns a single value from an array."""
    iterator = source.proxy.iterator()
    try:
      iterator.next()
      values = iterator.values(attribute)
      iterator.release()
      return values[0]
    except StopIteration:
      iterator.release()
    except:
      iterator.release()
      raise

  def values(self, source, attribute=0):
    """Returns a numpy array extracted from a single array attribute."""
    start_time = time.time()

    # Materialize every chunk into memory ...
    chunk_coordinates = []
    chunk_values = []
    iterator = source.proxy.iterator()
    try:
      while True:
        iterator.next()
        chunk_coordinates.append(iterator.coordinates())
        chunk_values.append(iterator.values(attribute))
    except StopIteration:
      iterator.release()
    except:
      iterator.release()
      raise

    # Calculate a compatible dtype for our result array (this would be easy,
    # except we have to handle string arrays, which will contain different
    # fixed-width string dtypes).
    #log.debug("dtypes: %s", [values.dtype for values in chunk_values])
    result_type = numpy.result_type(*[values.dtype for values in chunk_values])

    # Create the result array and populate it ...
    result = numpy.empty(source.shape, dtype=result_type)
    for coordinates, values in zip(chunk_coordinates, chunk_values):
      hyperslice = [slice(coordinate, coordinate + values.shape[index]) for index, coordinate in enumerate(coordinates)]
      result[hyperslice] = values

    log.info("elapsed time: %s seconds" % (time.time() - start_time))
    return result
  def workers(self):
    """Returns the set of available slycat analysis workers."""
    for worker in self.nameserver.list(prefix="slycat.worker").keys():
      proxy = Pyro4.Proxy(self.nameserver.lookup(worker))
      proxy._pyroOneway.add("shutdown")
      yield proxy
  def zeros(self, shape, chunks=None):
    return remote_array(self.proxy.zeros(shape, chunks))

class remote_array(object):
  def __init__(self, proxy):
    self.proxy = proxy
  def __del__(self):
    self.proxy.release()
  def __getattr__(self, name):
    if name == "shape":
      return tuple([dimension["end"] - dimension["begin"] for dimension in self.proxy.dimensions()])
    elif name == "ndim":
      return len(self.proxy.dimensions())
    elif name == "size":
      return numpy.prod([dimension["end"] - dimension["begin"] for dimension in self.proxy.dimensions()])
  def __setattr__(self, name, value):
    if name in ["shape", "ndim", "size"]:
      raise Exception("{} attribute is read-only.".format(name))
    object.__setattr__(self, name, value)
  def dimensions(self):
    """Returns a list of {name, type, begin, end, chunk-size} dicts that describe the array dimensions."""
    return self.proxy.dimensions()
  def attributes(self):
    """Returns a list of {name, type} dicts that describe the attributes stored in each array cell."""
    return self.proxy.attributes()
  def chunks(self):
    """Returns an iterator over array chunks that delivers data to the client."""
    attributes = self.proxy.attributes()
    iterator = self.proxy.iterator()
    try:
      while True:
        iterator.next()
        yield array_chunk(iterator, attributes)
    except StopIteration:
      iterator.release()
    except:
      iterator.release()
      raise

class remote_file_array(remote_array):
  def __init__(self, proxy):
    remote_array.__init__(self, proxy)
  def file_path(self):
    """Returns the underlying file path."""
    return self.proxy.file_path()
  def file_size(self):
    """Returns the size in bytes of the underlying file."""
    return self.proxy.file_size()

class array_chunk(object):
  def __init__(self, proxy, attributes):
    self._proxy = proxy
    self._attributes = attributes
  def coordinates(self):
    return self._proxy.coordinates()
  def shape(self):
    return self._proxy.shape()
  def attributes(self):
    for index, attribute in enumerate(self._attributes):
      yield array_chunk_attribute(self._proxy, index, attribute)
  def values(self, index):
    return self._proxy.values(index)

class array_chunk_attribute(object):
  def __init__(self, proxy, index, attribute):
    self.proxy = proxy
    self.index = index
    self.attribute = attribute
  def name(self):
    return self.attribute["name"]
  def type(self):
    return self.attribute["type"]
  def values(self):
    return self.proxy.values(self.index)
