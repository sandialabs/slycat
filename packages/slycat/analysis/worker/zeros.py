# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import numpy

from slycat.analysis.worker.api import array, array_iterator, worker_chunks

class zeros_array(array):
  def __init__(self, worker_index, shape, chunk_sizes, attributes):
    array.__init__(self, worker_index)
    self.shape = shape
    self.chunk_sizes = chunk_sizes
    self._attributes = attributes
  def dimensions(self):
    return [{"name":"d%s" % index, "type":"int64", "begin":0, "end":dimension, "chunk-size":chunk_size} for index, (dimension, chunk_size) in enumerate(zip(self.shape, self.chunk_sizes))]
  def attributes(self):
    return self._attributes
  def iterator(self):
    return self.pyro_register(zeros_array_iterator(self))

class zeros_array_iterator(array_iterator):
  def __init__(self, owner):
    array_iterator.__init__(self, owner)
    self.iterator = worker_chunks(owner.shape, owner.chunk_sizes, len(owner.siblings))
  def next(self):
    while True:
      chunk_index, worker_index, begin, end = self.iterator.next()
      if worker_index == self.owner.worker_index:
        self._coordinates = begin
        self._shape = end - begin
        break
  def coordinates(self):
    return self._coordinates
  def shape(self):
    return self._shape
  def values(self, index):
    return numpy.zeros(self._shape, dtype=self.owner._attributes[index]["type"])

