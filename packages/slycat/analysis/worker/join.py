# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

from slycat.analysis.worker.api import array, array_iterator

class join_array(array):
  def __init__(self, worker_index, source1, source2):
    array.__init__(self, worker_index)
    self.source1 = source1
    self.source2 = source2
  def dimensions(self):
    return self.source1.dimensions()
  def attributes(self):
    return self.source1.attributes() + self.source2.attributes()
  def iterator(self):
    return self.pyro_register(join_array_iterator(self))

class join_array_iterator(array_iterator):
  def __init__(self, owner):
    array_iterator.__init__(self, owner)
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

