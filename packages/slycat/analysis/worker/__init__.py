# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import logging
import numpy

handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))

log = logging.getLogger("slycat.analysis.worker")
log.setLevel(logging.INFO)
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
    self.worker_count = None
  def set_siblings(self, siblings):
    """Populates the iterator with handles to all its siblings (including itself)."""
    self.siblings = siblings
    self.worker_count = len(siblings)
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
  """Return the number of chunks required to partition the given array shape."""
  if len(shape) != len(chunk_sizes):
    raise Exception("Dimension mismatch.")
  shape = numpy.array(shape)
  chunk_sizes = numpy.array(chunk_sizes)
  return int(numpy.prod(numpy.ceil(numpy.true_divide(shape, chunk_sizes))))

def worker_chunk_counts(chunk_count, worker_count):
  """Iterate over the number of chunks assigned to each worker.

  Given the total number of chunks and the number of available workers, returns
  a chunk count for each worker that spreads chunks as fairly as possible.
  """
  partition_size = int(chunk_count / worker_count)
  extra = chunk_count % worker_count
  for i in range(0, extra):
    yield partition_size + 1
  for i in range(extra, worker_count):
    yield partition_size

def worker_chunk_ranges(chunk_count, worker_count):
  """Iterate over the range of chunk indices assigned to each worker.

  Given the total number of chunks and the number of available workers, returns
  a half-open range of chunks (begin, end] for each worker that spreads the
  chunks as fairly as possible.
  """
  begin = 0
  for count in worker_chunk_counts(chunk_count, worker_count):
    yield begin, begin + count
    begin += count

def worker_chunks(shape, chunk_sizes, worker_count):
  """Iterate over the chunks assigned to each worker.

  Given an array shape, maximum chunk sizes, and number of available workers,
  returns a four-tuple containing the following for each chunk: global chunk
  index, worker index, chunk begin coordinates (minimum chunk coordinate along
  each dimension), and chunk end coordinates (maximum chunk coordinate plus one
  along each dimension).
  """
  shape = numpy.array(shape)
  chunk_sizes = numpy.array(chunk_sizes)
  iterator = numpy.ndindex(*numpy.ceil(numpy.true_divide(shape, chunk_sizes)))
  for worker_index, (worker_begin, worker_end) in enumerate(worker_chunk_ranges(chunk_count(shape, chunk_sizes), worker_count)):
    for worker_chunk_index, global_chunk_index in enumerate(range(worker_begin, worker_end)):
      coordinates = numpy.array(iterator.next())
      begin_coordinates = numpy.multiply(coordinates, chunk_sizes)
      end_coordinates = numpy.minimum(shape, numpy.multiply(coordinates + 1, chunk_sizes))
      yield global_chunk_index, worker_index, begin_coordinates, end_coordinates

