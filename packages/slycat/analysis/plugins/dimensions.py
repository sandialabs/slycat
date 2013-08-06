# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def register_client_plugin(context):
  import slycat.analysis.client

  def dimensions(connection, source):
    """Return an array that describe's another array's dimensions.

    Creates a 1D array with attributes "name", "type", "begin", "end", and
    "chunk-size" and one cell for each of the source array's dimensions.  It is
    particularly useful when working with an array with a large number of
    dimensions.

      >>> scan(dimensions(random((1000, 2000, 3000), (100, 100, 100))))
        {i} name, type, begin, end, chunk-size
      * {0} d0, int64, 0, 1000, 100
        {1} d1, int64, 0, 2000, 100
        {2} d2, int64, 0, 3000, 100
    """
    source = slycat.analysis.client.require_array(source)
    return connection.remote_array(connection.proxy.dimensions(connection.require_object(source)))
  context.add_operator("dimensions", dimensions)

def register_coordinator_plugin(context):
  def dimensions(factory, source):
    source = factory.require_object(source)
    array_workers = []
    for worker_index, (source_proxy, worker) in enumerate(zip(source.workers, factory.workers())):
      array_workers.append(worker.dimensions(worker_index, source_proxy._pyroUri))
    return factory.pyro_register(factory.array(array_workers, [source]))
  context.add_operator("dimensions", dimensions)

def register_worker_plugin(context):
  import numpy
  def dimensions(factory, worker_index, source):
    return factory.pyro_register(dimensions_array(worker_index, factory.require_object(source)))

  class dimensions_array(context.array):
    def __init__(self, worker_index, source):
      context.array.__init__(self, worker_index)
      self.source_dimensions = source.dimensions()
    def dimensions(self):
      return [{"name":"i", "type":"int64", "begin":0, "end":len(self.source_dimensions), "chunk-size":len(self.source_dimensions)}]
    def attributes(self):
      return [{"name":"name", "type":"string"}, {"name":"type", "type":"string"}, {"name":"begin", "type":"int64"}, {"name":"end", "type":"int64"}, {"name":"chunk-size", "type":"int64"}]
    def iterator(self):
      if self.worker_index == 0:
        return self.pyro_register(dimensions_array_iterator(self))
      else:
        return self.pyro_register(context.null_array_iterator(self))

  class dimensions_array_iterator(context.array_iterator):
    def __init__(self, owner):
      context.array_iterator.__init__(self, owner)
      self.iterations = 0
    def next(self):
      if self.iterations:
        raise StopIteration()
      self.iterations += 1
    def coordinates(self):
      return numpy.array([0], dtype="int64")
    def shape(self):
      return numpy.array([len(self.owner.source_dimensions)], dtype="int64")
    def values(self, attribute):
      if attribute == 0:
        return numpy.array([dimension["name"] for dimension in self.owner.source_dimensions], dtype="string")
      elif attribute == 1:
        return numpy.array([dimension["type"] for dimension in self.owner.source_dimensions], dtype="string")
      elif attribute == 2:
        return numpy.array([dimension["begin"] for dimension in self.owner.source_dimensions], dtype="int64")
      elif attribute == 3:
        return numpy.array([dimension["end"] for dimension in self.owner.source_dimensions], dtype="int64")
      elif attribute == 4:
        return numpy.array([dimension["chunk-size"] for dimension in self.owner.source_dimensions], dtype="int64")

  context.add_operator("dimensions", dimensions)
