# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import numpy

from slycat.analysis.worker.api import array, array_iterator, null_array_iterator

class array_array(array):
  def __init__(self, worker_index, initializer, attribute):
    array.__init__(self, worker_index)
    self.chunk = numpy.array(initializer, dtype=attribute["type"])
    self.attribute = attribute
  def dimensions(self):
    return [{"name":"d%s" % index, "type":"int64", "begin":0, "end":size, "chunk-size":size} for index, size in enumerate(self.chunk.shape)]
  def attributes(self):
    return [self.attribute]
  def iterator(self):
    if 0 == self.worker_index:
      return self.pyro_register(array_array_iterator(self))
    else:
      return self.pyro_register(null_array_iterator(self))

class array_array_iterator(array_iterator):
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
    return self.owner.chunk.shape
  def values(self, attribute):
    return self.owner.chunk

