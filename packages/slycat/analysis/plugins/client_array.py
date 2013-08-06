# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def register_client_plugin(context):
  import slycat.analysis.client

  def array(connection, initializer, attribute="val"):
    """Return an array containing client-supplied data.

    Creates an array with a single attribute, populated from a client-supplied
    initializer.  The initializer may be any numpy array, or any (arbitrarily
    nested) sequence.  Use the attribute parameter to specify the name of the
    resulting attribute, or a tuple with the attribute name and type, which
    otherwise defaults to float64.

    Because the array() operator copies data provided by the client, it is
    necessarily limited in scope to data that fits within the client's memory.
    Thus, the resulting array is presumed to be relatively small, e.g.
    parameters provided by a user, small lookup dictionaries, etc.  You should
    avoid using array() with "large" data, preferring to manipulate it all
    remotely instead.

      >>> scan(array([1, 2, 3]))
        {d0} val
      * {0} 1.0
        {1} 2.0
        {2} 3.0

      >>> scan(array([1, 2, 3], attribute="foo"))
        {d0} foo
      * {0} 1.0
        {1} 2.0
        {2} 3.0

      >>> scan(array([1, 2, 3], attribute=("foo", "int32")))
        {d0} foo
      * {0} 1
        {1} 2
        {2} 3

      >>> scan(array([[1, 2, 3], [4, 5, 6]]))
        {d0, d1} val
      * {0, 0} 1.0
        {0, 1} 2.0
        {0, 2} 3.0
        {1, 0} 4.0
        {1, 1} 5.0
        {1, 2} 6.0
    """
    attribute = slycat.analysis.client.require_attribute(attribute)
    return connection.remote_array(connection.proxy.standard_call("client_array", [], initializer, attribute))
  context.add_operator("array", array)

def register_worker_plugin(context):
  import numpy
  import slycat.analysis.worker

  def client_array(factory, worker_index, initializer, attribute):
    return factory.pyro_register(client_array_array(worker_index, initializer, attribute))

  class client_array_array(slycat.analysis.worker.array):
    def __init__(self, worker_index, initializer, attribute):
      slycat.analysis.worker.array.__init__(self, worker_index)
      self.chunk = numpy.array(initializer, dtype=attribute["type"])
      self.attribute = attribute
    def dimensions(self):
      return [{"name":"d%s" % index, "type":"int64", "begin":0, "end":size, "chunk-size":size} for index, size in enumerate(self.chunk.shape)]
    def attributes(self):
      return [self.attribute]
    def iterator(self):
      if 0 == self.worker_index:
        return self.pyro_register(client_array_array_iterator(self))
      else:
        return self.pyro_register(slycat.analysis.worker.null_array_iterator(self))

  class client_array_array_iterator(slycat.analysis.worker.array_iterator):
    def __init__(self, owner):
      slycat.analysis.worker.array_iterator.__init__(self, owner)
      self.iterations = 0
    def next(self):
      if self.iterations:
        raise StopIteration()
      self.iterations += 1
    def coordinates(self):
      return numpy.array([0], dtype="int64")
    def shape(self):
      return self.owner.chunk.shape
    def values(self, attribute):
      return self.owner.chunk
  context.add_operator("client_array", client_array)
