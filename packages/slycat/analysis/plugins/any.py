# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def register_client_plugin(context):
  import slycat.analysis.plugin.client

  def any(connection, source):
    """Test whether any element of an array is true.

    Signature: any(source)
    """
    source = slycat.analysis.plugin.client.require_array(source)
    return connection.create_remote_array("any", [source])
  context.register_plugin_function("any", any)

def register_worker_plugin(context):
  import numpy
  import slycat.analysis.plugin.worker

  def any(factory, worker_index, source):
    return factory.pyro_register(any_array(worker_index, factory.require_object(source)))

  class any_array(slycat.analysis.plugin.worker.array):
    def __init__(self, worker_index, source):
      slycat.analysis.plugin.worker.array.__init__(self, worker_index)
      self.source = source
      self.source_attributes = None
    def update_attributes(self):
      if self.source_attributes is None:
        self.source_attributes = self.source.attributes()
    def dimensions(self):
      return self.source.dimensions()
    def attributes(self):
      return [{"name":"any", "type":"bool"}]
    def iterator(self):
      self.update_attributes()
      return self.pyro_register(any_array_iterator(self, self.source))

  class any_array_iterator(slycat.analysis.plugin.worker.array_iterator):
    def __init__(self, owner, source):
      slycat.analysis.plugin.worker.array_iterator.__init__(self, owner)
      self.iterator = source.iterator()
    def __del__(self):
      self.iterator.release()
    def next(self):
      self.iterator.next()
    def coordinates(self):
      return self.iterator.coordinates()
    def shape(self):
      return self.iterator.shape()
    def values(self, index):
      source_values = [numpy.ma.expand_dims(self.iterator.values(index), -1) for index, attribute in enumerate(self.owner.source_attributes)]
      return numpy.ma.any(numpy.ma.concatenate(source_values, axis=-1), axis=-1)
  context.register_plugin_function("any", any)
