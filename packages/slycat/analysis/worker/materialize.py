# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
from __future__ import division

import ast
import numpy

from slycat.analysis.worker.api import log, array, array_iterator

class materialize_array(array):
  def __init__(self, worker_index, source):
    array.__init__(self, worker_index)
    self.source = source
    self.chunks = None
  def dimensions(self):
    return self.source.dimensions()
  def attributes(self):
    return self.source.attributes()
  def iterator(self):
    return self.pyro_register(materialize_array_iterator(self))
  def materialize(self):
    if self.chunks is None:
      attribute_count = len(self.source.attributes())
      with self.source.iterator() as iterator:
        self.chunks = [materialize_array_chunk(iterator, attribute_count) for ignored in iterator]

class materialize_array_chunk:
  def __init__(self, iterator, attribute_count):
    self._coordinates = iterator.coordinates()
    self._shape = iterator.shape()
    self._values = [iterator.values(attribute) for attribute in range(attribute_count)]
  def coordinates(self):
    return self._coordinates
  def shape(self):
    return self._shape
  def values(self, attribute):
    return self._values[attribute]

class materialize_array_iterator(array_iterator):
  def __init__(self, owner):
    array_iterator.__init__(self, owner)
    self.index = -1
  def next(self):
    self.owner.materialize()
    self.index += 1
    if self.index == len(self.owner.chunks):
      raise StopIteration()
  def coordinates(self):
    return self.owner.chunks[self.index].coordinates()
  def shape(self):
    return self.owner.chunks[self.index].shape()
  def values(self, attribute):
    return self.owner.chunks[self.index].values(attribute)

