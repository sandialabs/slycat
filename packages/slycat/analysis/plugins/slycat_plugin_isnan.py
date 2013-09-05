# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def register_client_plugin(context):
  import slycat.analysis.plugin.client

  def isnan(connection, source):
    """Return an array that identifies NaNs in the source.

    Signature: isnan(source)

    Creates an array containing a boolean attribute matching each of the
    source's attributes.  Each value in the output array will be True if the
    corresponding value in the source array is NaN, else False.

      >>> autos = load("../data/automobiles.csv", schema="csv-file", chunk_size=100)

    """
    source = slycat.analysis.plugin.client.require_array(source)
    return connection.create_remote_array("isnan", [source])
  context.register_plugin_function("isnan", isnan)

def register_worker_plugin(context):
  import numpy
  import slycat.analysis.plugin.worker

  def isnan(factory, worker_index, source):
    return factory.pyro_register(isnan_array(worker_index, factory.require_object(source)))

  class isnan_array(slycat.analysis.plugin.worker.array):
    def __init__(self, worker_index, source):
      slycat.analysis.plugin.worker.array.__init__(self, worker_index)
      self.source = source
    def dimensions(self):
      return self.source.dimensions()
    def attributes(self):
      return [{"name":attribute["name"], "type":"bool"} for attribute in self.source.attributes()]
    def iterator(self):
      return self.pyro_register(isnan_array_iterator(self, self.source))

  class isnan_array_iterator(slycat.analysis.plugin.worker.array_iterator):
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
      return numpy.isnan(source_values)
  context.register_plugin_function("isnan", isnan)
