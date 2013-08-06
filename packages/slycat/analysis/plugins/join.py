# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def register_client_plugin(context):
  import slycat.analysis.client

  def join(connection, array1, array2):
    """Return an array combining the attributes of two arrays.

    The shape (number of dimensions, size, and chunk size of each dimension) of
    the two inputs must be identical.  The result array will have the same
    shape as the inputs, with the union of their attributes and dimension names
    chosen from the first input.

    Note that join() may create arrays with duplicate attribute names.  When
    this happens, most operators allow you to reference attributes by index for
    disambiguation.

      >>> scan(join(random(5, attributes="foo"), zeros(5, attributes="bar")))
        {d0} foo, bar
      * {0} 0.929616092817, 0.0
        {1} 0.316375554582, 0.0
        {2} 0.183918811677, 0.0
        {3} 0.204560278553, 0.0
        {4} 0.567725029082, 0.0
    """
    array1 = slycat.analysis.client.require_array(array1)
    array2 = slycat.analysis.client.require_array(array2)
    dimensions1 = [{"type":dimension["type"], "begin":dimension["begin"], "end":dimension["end"], "chunk-size":dimension["chunk-size"]} for dimension in array1.dimensions]
    dimensions2 = [{"type":dimension["type"], "begin":dimension["begin"], "end":dimension["end"], "chunk-size":dimension["chunk-size"]} for dimension in array2.dimensions]
    if dimensions1 != dimensions2:
      raise slycat.analysis.client.InvalidArgument("Arrays to be joined must have identical dimensions.")
    return connection.remote_array(connection.proxy.join(connection.require_object(array1), connection.require_object(array2)))
  context.add_operator("join", join)

def register_coordinator_plugin(context):
  def join(factory, array1, array2):
    array1 = factory.require_object(array1)
    array2 = factory.require_object(array2)
    array_workers = []
    for worker_index, (array1_proxy, array2_proxy, worker) in enumerate(zip(array1.workers, array2.workers, factory.workers())):
      array_workers.append(worker.join(worker_index, array1_proxy._pyroUri, array2_proxy._pyroUri))
    return factory.pyro_register(factory.array(array_workers, [array1, array2]))
  context.add_operator("join", join)

def register_worker_plugin(context):
  import slycat.analysis.worker

  def join(factory, worker_index, array1, array2):
    return factory.pyro_register(join_array(worker_index, factory.require_object(array1), factory.require_object(array2)))

  class join_array(slycat.analysis.worker.array):
    def __init__(self, worker_index, source1, source2):
      slycat.analysis.worker.array.__init__(self, worker_index)
      self.source1 = source1
      self.source2 = source2
    def dimensions(self):
      return self.source1.dimensions()
    def attributes(self):
      return self.source1.attributes() + self.source2.attributes()
    def iterator(self):
      return self.pyro_register(join_array_iterator(self))

  class join_array_iterator(slycat.analysis.worker.array_iterator):
    def __init__(self, owner):
      slycat.analysis.worker.array_iterator.__init__(self, owner)
      self.offset = len(self.owner.source1.attributes())
      self.iterator1 = self.owner.source1.iterator()
      self.iterator2 = self.owner.source2.iterator()
    def __del__(self):
      self.iterator2.release()
      self.iterator1.release()
    def next(self):
      self.iterator1.next()
      self.iterator2.next()
    def coordinates(self):
      return self.iterator1.coordinates()
    def shape(self):
      return self.iterator1.shape()
    def values(self, attribute):
      if attribute < self.offset:
        return self.iterator1.values(attribute)
      else:
        return self.iterator2.values(attribute - self.offset)
  context.add_operator("join", join)
