# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import numpy

from slycat.analysis.worker.api import array

class rename_array(array):
  def __init__(self, worker_index, source, attribute_map, dimension_map):
    array.__init__(self, worker_index)
    self.source = source
    self.attribute_map = attribute_map
    self.dimension_map = dimension_map
  def dimensions(self):
    results = []
    for index, dimension in enumerate(self.source.dimensions()):
      name = dimension["name"]
      type = dimension["type"]
      begin = dimension["begin"]
      end = dimension["end"]
      chunk_size = dimension["chunk-size"]
      if index in self.dimension_map:
        name = self.dimension_map[index]
      elif name in self.dimension_map:
        name = self.dimension_map[name]
      results.append({"name":name, "type":type, "begin":begin, "end":end, "chunk-size":chunk_size})
    return results
  def attributes(self):
    results = []
    for index, attribute in enumerate(self.source.attributes()):
      name = attribute["name"]
      type = attribute["type"]
      if index in self.attribute_map:
        name = self.attribute_map[index]
      elif name in self.attribute_map:
        name = self.attribute_map[name]
      results.append({"name":name, "type":type})
    return results
  def iterator(self):
    return self.source.iterator()

