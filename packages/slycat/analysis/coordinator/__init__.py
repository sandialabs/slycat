import logging
import Pyro4

handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))

log = logging.getLogger("slycat.analysis.coordinator")
log.setLevel(logging.INFO)
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

