# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import numpy

from slycat.analysis.worker.api import array, array_iterator, null_array_iterator

class dimensions_array(array):
  def __init__(self, worker_index, source):
    array.__init__(self, worker_index)
    self.source_dimensions = source.dimensions()
  def dimensions(self):
    return [{"name":"i", "type":"int64", "begin":0, "end":len(self.source_dimensions), "chunk-size":len(self.source_dimensions)}]
  def attributes(self):
    return [{"name":"name", "type":"string"}, {"name":"type", "type":"string"}, {"name":"begin", "type":"int64"}, {"name":"end", "type":"int64"}, {"name":"chunk-size", "type":"int64"}]
  def iterator(self):
    if self.worker_index == 0:
      return self.pyro_register(dimensions_array_iterator(self))
    else:
      return self.pyro_register(null_array_iterator(self))

class dimensions_array_iterator(array_iterator):
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

