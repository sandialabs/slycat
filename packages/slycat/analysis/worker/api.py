# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import logging
import math
import numpy

handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))

log = logging.getLogger("slycat.analysis.worker")
log.setLevel(logging.DEBUG)
log.addHandler(handler)

class pyro_object(object):
  """Provides some standardized functionality for objects that are exported via Pyro4."""
  def __init__(self):
    self.refcount = 1
  def __del__(self):
    if self.refcount != 0:
      log.error("Deleting object with nonzero reference count: %s", self)
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

class array(pyro_object):
  """Abstract interface for a multi-attribute, multi-dimensional array."""
  def __init__(self, worker_index):
    pyro_object.__init__(self)
    self.worker_index = worker_index
  def set_siblings(self, siblings):
    """Populates the iterator with handles to all its siblings (including itself)."""
    self.siblings = siblings
  def dimensions(self):
    raise NotImplementedError()
  def attributes(self):
    raise NotImplementedError()
  def iterator(self):
    """Returns an object that can be used to iterate over the array contents."""
    raise NotImplementedError()

class array_iterator(pyro_object):
  """Abstract interface for iterating over an array one chunk (hypercube) at a time."""
  def __init__(self, owner):
    pyro_object.__init__(self)
    self.owner = owner
  def __enter__(self):
    return self
  def __exit__(self, exception_type, exception_value, traceback):
    self.release()
  def __iter__(self):
    return self
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

class null_array_iterator(array_iterator):
  def __init__(self, owner):
    array_iterator.__init__(self, owner)
  def next(self):
    raise StopIteration
  def coordinates(self):
    raise Exception("No coordinates available.")
  def shape(self):
    raise Exception("No shape available.")
  def values(self, attribute):
    raise Exception("No values available.")

def chunk_count(shape, chunk_sizes):
  """Given an array shape and chunk sizes, return the total number of chunks in the array."""
  if len(shape) != len(chunk_sizes):
    raise Exception("Dimension mismatch.")
  shape = numpy.array(shape)
  chunk_sizes = numpy.array(chunk_sizes)
  return int(numpy.prod(numpy.ceil(numpy.true_divide(shape, chunk_sizes))))

def chunk_range(chunk_count, worker_index, worker_count):
  """Assigns a half-open range of chunks to a worker."""
  if worker_index < 0 or worker_index >= worker_count:
    raise Exception("Invalid worker index.")
  partition = int(math.ceil(chunk_count / float(worker_count)))
  return min(chunk_count, worker_index * partition), min(chunk_count, (worker_index + 1) * partition)

def chunk_iterator(shape, chunk_sizes, range=None):
  """Iterates over the chunks in an array in-order, returning the chunk id, begin coordinates, and end coordinates of each chunk."""
  if len(shape) != len(chunk_sizes):
    raise Exception("Dimension mismatch.")
  shape = numpy.array(shape)
  chunk_sizes = numpy.array(chunk_sizes)
  begin = range[0] if range is not None else 0
  end = range[1] if range is not None else sys.maxint
  iterator = numpy.ndindex(*numpy.ceil(numpy.true_divide(shape, chunk_sizes)))
  for index, coordinates in enumerate(iterator):
    if index < begin or index >= end:
      continue
    coordinates = numpy.array(coordinates)
    yield index, numpy.multiply(coordinates, chunk_sizes), numpy.minimum(shape, numpy.multiply(coordinates + 1, chunk_sizes))

