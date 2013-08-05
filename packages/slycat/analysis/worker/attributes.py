# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import numpy

from slycat.analysis.worker.api import array, array_iterator, null_array_iterator

class attributes_array(array):
  def __init__(self, worker_index, source):
    array.__init__(self, worker_index)
    self.source_attributes = source.attributes()
  def dimensions(self):
    return [{"name":"i", "type":"int64", "begin":0, "end":len(self.source_attributes), "chunk-size":len(self.source_attributes)}]
  def attributes(self):
    return [{"name":"name", "type":"string"}, {"name":"type", "type":"string"}]
  def iterator(self):
    if 0 == self.worker_index:
      return self.pyro_register(attributes_array_iterator(self))
    else:
      return self.pyro_register(null_array_iterator(self))

class attributes_array_iterator(array_iterator):
  def __init__(self, owner):
    array_iterator.__init__(self, owner)
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
      return numpy.array([attribute["name"] for attribute in self.owner.source_attributes], dtype="string")
    elif attribute == 1:
      return numpy.array([attribute["type"] for attribute in self.owner.source_attributes], dtype="string")

