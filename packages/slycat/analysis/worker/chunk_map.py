# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import numpy
import Pyro4

from slycat.analysis.worker.api import log, array, array_iterator, null_array_iterator

class chunk_map_array(array):
  def __init__(self, worker_index, source):
    array.__init__(self, worker_index)
    self.source = source
    self.source_dimensions = source.dimensions()
    self.chunk_map = None
  def local_chunk_map(self):
    results = []
    with self.source.iterator() as iterator:
      for index, ignored in enumerate(iterator):
        results.append((self.worker_index, index, iterator.coordinates(), iterator.shape()))
    return results
  def gather_global_chunk_map(self):
    if self.chunk_map is not None:
      return
    results = [Pyro4.async(sibling).local_chunk_map() for sibling in self.siblings]
    results = [result.value for result in results]
    results = [chunk for result in results for chunk in result]
    self.chunk_map = results
  def dimensions(self):
    self.gather_global_chunk_map()
    chunk_count = len(self.chunk_map)
    return [{"name":"i", "type":"int64", "begin":0, "end":chunk_count, "chunk-size":chunk_count}]
  def attributes(self):
    return [{"name":"worker", "type":"int64"}, {"name":"index", "type":"int64"}] + [{"name":"c%s" % index, "type":dimension["type"]} for index, dimension in enumerate(self.source_dimensions)] + [{"name":"s%s" % index, "type":"int64"} for index, dimension in enumerate(self.source_dimensions)]
  def iterator(self):
    if 0 == self.worker_index:
      return self.pyro_register(chunk_map_iterator(self))
    else:
      return self.pyro_register(null_array_iterator(self))

class chunk_map_iterator(array_iterator):
  def __init__(self, owner):
    array_iterator.__init__(self, owner)
    self.iterations = 0
  def next(self):
    if self.iterations:
      raise StopIteration()
    self.iterations += 1
    self.owner.gather_global_chunk_map()
  def coordinates(self):
    return numpy.array([0], dtype="int64")
  def shape(self):
    return numpy.array([len(self.owner.chunk_map)], dtype="int64")
  def values(self, attribute):
    if attribute == 0: # worker
      return numpy.array([chunk[0] for chunk in self.owner.chunk_map], dtype="int64")
    elif attribute == 1: # index
      return numpy.array([chunk[1] for chunk in self.owner.chunk_map], dtype="int64")
    elif attribute >= 2 and attribute < 2 + len(self.owner.source_dimensions): # coordinates
      return numpy.array([chunk[2][attribute - 2] for chunk in self.owner.chunk_map], dtype="int64")
    else:
      return numpy.array([chunk[3][attribute - 2 - len(self.owner.source_dimensions)] for chunk in self.owner.chunk_map], dtype="int64")

