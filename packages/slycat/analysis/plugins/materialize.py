# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain

def register_client_plugin(context):
  import slycat.analysis.client

  def materialize(connection, source):
    """Return a materialized (loaded into memory) version of an array.

    Normally, array data is divided into chunks that are loaded and streamed
    through the system only when needed, allowing you to work with arrays that
    will not fit into memory.  The down-side to this approach is that the
    results of a computation aren't retained, and will be recomputed the next
    time they're needed.  However, in some cases you may have an array of
    intermediate results that were expensive to compute and can fit into memory
    - in this case, creating a materialized version of the array allows you to
    re-use those results without recomputing them every time:

      >>> array1 = # Expensive-to-compute array
      >>> array2 = materialize(array1)
      # Now, use array2 in place of array1, to avoid recomputing.
    """
    source = slycat.analysis.client.require_array(source)
    return connection.remote_array(connection.proxy.materialize(connection.require_object(source)))
  context.add_operator("materialize", materialize)

def register_coordinator_plugin(context):
  import slycat.analysis.coordinator

  def materialize(factory, source):
    source = factory.require_object(source)
    array_workers = []
    for worker_index, (source_proxy, worker) in enumerate(zip(source.workers, factory.workers())):
      array_workers.append(worker.materialize(worker_index, source_proxy._pyroUri))
    return factory.pyro_register(slycat.analysis.coordinator.array(array_workers, [source]))
  context.add_operator("materialize", materialize)

def register_worker_plugin(context):
  import numpy
  import slycat.analysis.worker

  def materialize(factory, worker_index, source):
    return factory.pyro_register(materialize_array(worker_index, factory.require_object(source)))

  class materialize_array(slycat.analysis.worker.array):
    def __init__(self, worker_index, source):
      slycat.analysis.worker.array.__init__(self, worker_index)
      self.source = source
      self.chunks = None
    def dimensions(self):
      return self.source.dimensions()
    def attributes(self):
      return self.source.attributes()
    def iterator(self):
      return self.pyro_register(materialize_array_iterator(self))
    def materialize(self):
      if self.chunks is None:
        attribute_count = len(self.source.attributes())
        with self.source.iterator() as iterator:
          self.chunks = [materialize_array_chunk(iterator, attribute_count) for ignored in iterator]

  class materialize_array_chunk:
    def __init__(self, iterator, attribute_count):
      self._coordinates = iterator.coordinates()
      self._shape = iterator.shape()
      self._values = [iterator.values(attribute) for attribute in range(attribute_count)]
    def coordinates(self):
      return self._coordinates
    def shape(self):
      return self._shape
    def values(self, attribute):
      return self._values[attribute]

  class materialize_array_iterator(slycat.analysis.worker.array_iterator):
    def __init__(self, owner):
      slycat.analysis.worker.array_iterator.__init__(self, owner)
      self.index = -1
    def next(self):
      self.owner.materialize()
      self.index += 1
      if self.index == len(self.owner.chunks):
        raise StopIteration()
    def coordinates(self):
      return self.owner.chunks[self.index].coordinates()
    def shape(self):
      return self.owner.chunks[self.index].shape()
    def values(self, attribute):
      return self.owner.chunks[self.index].values(attribute)

  context.add_operator("materialize", materialize)
