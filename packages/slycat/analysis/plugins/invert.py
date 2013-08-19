# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def register_client_plugin(context):
  import slycat.analysis.plugin.client

  def invert(connection, source):
    """Invert the contents of an array.

    Signature: invert(source)
    """
    source = slycat.analysis.plugin.client.require_array(source)
    return connection.create_remote_array("invert", [source])
  context.register_plugin_function("invert", invert)

def register_worker_plugin(context):
  import numpy
  import slycat.analysis.plugin.worker

  def invert(factory, worker_index, source):
    return factory.pyro_register(invert_array(worker_index, factory.require_object(source)))

  class invert_array(slycat.analysis.plugin.worker.array):
    def __init__(self, worker_index, source):
      slycat.analysis.plugin.worker.array.__init__(self, worker_index)
      self.source = source
    def dimensions(self):
      return self.source.dimensions()
    def attributes(self):
      return self.source.attributes()
    def iterator(self):
      return self.pyro_register(invert_array_iterator(self, self.source))

  class invert_array_iterator(slycat.analysis.plugin.worker.array_iterator):
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
      source_values = self.iterator.values(index)
      if source_values.dtype.char == "S":
        return numpy.ma.zeros(source_values.shape).astype("bool")
      return numpy.invert(source_values)
  context.register_plugin_function("invert", invert)
