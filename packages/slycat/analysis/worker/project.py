# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

from slycat.analysis.worker.api import array, array_iterator

class project_array(array):
  def __init__(self, worker_index, source, attributes):
    array.__init__(self, worker_index)
    self.source = source
    source_attributes = self.source.attributes()
    source_map = dict([(i, i) for i in range(len(source_attributes))] + [(attribute["name"], index) for index, attribute in enumerate(source_attributes)])
    self.indices = [source_map[attribute] for attribute in attributes if attribute in source_map]
  def dimensions(self):
    return self.source.dimensions()
  def attributes(self):
    source_attributes = self.source.attributes()
    return [source_attributes[index] for index in self.indices]
  def iterator(self):
    return self.pyro_register(project_array_iterator(self, self.source, self.indices))

class project_array_iterator(array_iterator):
  def __init__(self, owner, source, indices):
    array_iterator.__init__(self, owner)
    self.iterator = source.iterator()
    self.indices = indices
  def __del__(self):
    self.iterator.release()
  def next(self):
    self.iterator.next()
  def coordinates(self):
    return self.iterator.coordinates()
  def shape(self):
    return self.iterator.shape()
  def values(self, attribute):
    return self.iterator.values(self.indices[attribute])

