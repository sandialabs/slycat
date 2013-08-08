# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def register_client_plugin(context):
  import slycat.analysis.client

  def attributes(connection, source):
    """Return an array that describes some other array's attributes.

    Creates a 1D array with attributes "name" and "type" and one cell for each
    of another array's attributes.  It is particularly useful when working with
    an array with a large number of attributes.

      >>> scan(attributes(load("../data/automobiles.csv", schema="csv-file", chunk_size=100)))
        {i} name, type
      * {0} Model, string
        {1} Origin, string
        {2} Year, string
        {3} Cylinders, string
        {4} Acceleration, string
        {5} Displacement, string
        {6} Horsepower, string
        {7} MPG, string
    """
    source = slycat.analysis.client.require_array(source)
    return connection.create_remote_array("attributes", [source])
  context.register_plugin_function("attributes", attributes)

def register_worker_plugin(context):
  import numpy

  import slycat.analysis.worker

  def attributes(factory, worker_index, source):
    return factory.pyro_register(attributes_array(worker_index, factory.require_object(source)))

  class attributes_array(slycat.analysis.worker.array):
    def __init__(self, worker_index, source):
      slycat.analysis.worker.array.__init__(self, worker_index)
      self.source_attributes = source.attributes()
    def dimensions(self):
      return [{"name":"i", "type":"int64", "begin":0, "end":len(self.source_attributes), "chunk-size":len(self.source_attributes)}]
    def attributes(self):
      return [{"name":"name", "type":"string"}, {"name":"type", "type":"string"}]
    def iterator(self):
      if 0 == self.worker_index:
        return self.pyro_register(attributes_array_iterator(self))
      else:
        return self.pyro_register(slycat.analysis.worker.null_array_iterator(self))

  class attributes_array_iterator(slycat.analysis.worker.array_iterator):
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
      return numpy.array([len(self.owner.source_attributes)], dtype="int64")
    def values(self, attribute):
      if attribute == 0:
        return numpy.ma.array([attribute["name"] for attribute in self.owner.source_attributes], dtype="string")
      elif attribute == 1:
        return numpy.ma.array([attribute["type"] for attribute in self.owner.source_attributes], dtype="string")
  context.register_plugin_function("attributes", attributes)
