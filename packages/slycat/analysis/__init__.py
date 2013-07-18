# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

"""Parallel streaming data analysis.

Slycat Analysis provides a Pythonic API for interactive exploratory analysis of
remote, multi-dimension, multi-attribute arrays.  Using Slycat Analysis, you
connect to a running Slycat Analysis Coordinator to create, load, and
manipulate arrays that are distributed across one-to-many Slycat Analysis
Workers for parallel computation.  Arrays are further chunked (streamed)
through the system, so you can manipulate arrays that are larger than the
available system memory.
"""

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
  """Return a connection to a running Slycat Analysis Coordinator.

  Note that you only need to call connect() explicitly when supplying your own
  parameters.  Otherwise, connect() will be called automatically when you use
  any of the other functions in this module.

  You will likely never need to call connect() more than once or keep track of
  the returned connection object, unless you need connections to more than one
  Slycat Analysis Coordinator.
  """
  global current_coordinator
  Pyro4.config.HMAC_KEY = hmac_key
  nameserver = Pyro4.locateNS(host, port)
  current_coordinator = coordinator(nameserver)
  return current_coordinator
def get_coordinator():
  """Return the current (most recently connected) coordinator."""
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
def materialize(source):
  """Return a materialized (loaded into memory) version of an array.

  Normally, array data is only loaded and streamed through the system when
  needed, allowing you to work with arrays that would not fit into memory.
  However, in some cases you may have an array of intermediate results that
  were expensive to compute and can fit into memory - in this case, creating a
  materialized version of the array allows you to re-use those results without
  recomputing them every time:

     >>> array1 = # Expensive-to-compute array
     >>> array2 = materialize(array1)
     # Now, use array2 in place of array1, to avoid recomputing.
  """
  return get_coordinator().materialize(source)
def project(source, *attributes):
  return get_coordinator().project(source, *attributes)
def random(shape, chunks=None, seed=12345):
  """Return an array of random values.

  Creates an array with the given shape and chunk sizes, with a single
  attribute filled with random numbers in the range [0, 1].

  The shape parameter must be an int or a sequence of ints that specify the
  size of the array along each dimension.  The chunk parameter must an int or
  sequence of ints that specify the maximum size of an array chunk along each
  dimension, and must match the number of dimensions implied by the shape
  parameter.  If the chunk parameter is None, the chunk sizes will be identical
  to the array shape (i.e. the array will have a single chunk).  The seed
  parameter is used by the underlying random number generator and can be used
  to repeat results.

    >>> scan(attributes(random(4)))
      {i} name,type
    * {0} val,float64

    >>> scan(dimensions(random(4)))
      {i} name,type,begin,end,chunk-size
    * {0} d0,int64,0,4,4

    >>> scan(random(4))
      {d0} val
    * {0} 0.929616092817
      {1} 0.316375554582
      {2} 0.183918811677
      {3} 0.204560278553

    >>> scan(random(4, 2))
      {d0} val
    * {0} 0.929616092817
      {1} 0.316375554582
    * {2} 0.92899722191
      {3} 0.449165754101

    >>> scan(dimensions(random((4, 4), (2, 2))))
      {i} name,type,begin,end,chunk-size
    * {0} d0,int64,0,4,2
      {1} d1,int64,0,4,2

    >>> scan(random((4, 4), (2, 2)))
      {d0,d1} val
    * {0,0} 0.929616092817
      {0,1} 0.316375554582
      {1,0} 0.183918811677
      {1,1} 0.204560278553
    * {0,2} 0.92899722191
      {0,3} 0.449165754101
      {1,2} 0.228315321884
      {1,3} 0.707144041509
    * {2,0} 0.703148581097
      {2,1} 0.537772928495
      {3,0} 0.24899574575
      {3,1} 0.534471770025
    * {2,2} 0.370670417272
      {2,3} 0.602791780041
      {3,2} 0.229158970052
      {3,3} 0.486744328559
  """
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
  """Return an array of all zeros.

  Creates an array with the given shape and chunk sizes, with a single
  attribute filled with zeros.

  The shape parameter must be an int or a sequence of ints that specify the
  size of the array along each dimension.  The chunk parameter must an int or
  sequence of ints that specify the maximum size of an array chunk along each
  dimension, and must match the number of dimensions implied by the shape
  parameter.  If the chunk parameter is None, the chunk sizes will be identical
  to the array shape (i.e. the array will have a single chunk).

    >>> scan(attributes(zeros(4)))
      {i} name,type
    * {0} val,float64

    >>> scan(dimensions(zeros(4)))
      {i} name,type,begin,end,chunk-size
    * {0} d0,int64,0,4,4

    >>> scan(zeros(4))
      {d0} val
    * {0} 0.0
      {1} 0.0
      {2} 0.0
      {3} 0.0

    >>> scan(zeros(4, 2))
      {d0} val
    * {0} 0.0
      {1} 0.0
    * {2} 0.0
      {3} 0.0

    >>> scan(dimensions(zeros((4, 4), (2, 2))))
      {i} name,type,begin,end,chunk-size
    * {0} d0,int64,0,4,2
      {1} d1,int64,0,4,2

    >>> scan(zeros((4, 4), (2, 2)))
      {d0,d1} val
    * {0,0} 0.0
      {0,1} 0.0
      {1,0} 0.0
      {1,1} 0.0
    * {0,2} 0.0
      {0,3} 0.0
      {1,2} 0.0
      {1,3} 0.0
    * {2,0} 0.0
      {2,1} 0.0
      {3,0} 0.0
      {3,1} 0.0
    * {2,2} 0.0
      {2,3} 0.0
      {3,2} 0.0
      {3,3} 0.0
  """
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
  def materialize(self, source):
    return remote_array(self.proxy.materialize(source.proxy._pyroUri))
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
  """Proxy for a remote, multi-dimension, multi-attribute array."""
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
    """Return a sequence of dicts that describe the array dimensions.

        >>> a = random((100, 2))
        >>> a.dimensions()
        [{'end': 100, 'begin': 0, 'type': 'int64', 'name': 'd0', 'chunk-size': 100}, {'end': 2, 'begin': 0, 'type': 'int64', 'name': 'd1', 'chunk-size': 2}]
    """
    return self.proxy.dimensions()
  def attributes(self):
    """Return a sequence of dicts that describe the attributes stored in each array cell.

        >>> a = random((100, 2))
        >>> a.attributes()
        [{'type': 'float64', 'name': 'val'}]
    """
    return self.proxy.attributes()
  def chunks(self):
    """Return an iterator that accesses each chunk in the underlying array."""
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
  """Proxy for a remote, multi-dimension, multi-attribute array that was loaded from a single file."""
  def __init__(self, proxy):
    remote_array.__init__(self, proxy)
  def file_path(self):
    """Return the path to the loaded file."""
    return self.proxy.file_path()
  def file_size(self):
    """Return the size in bytes of the loaded file."""
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
