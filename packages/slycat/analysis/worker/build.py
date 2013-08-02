# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
from __future__ import division

import ast
import numpy

from slycat.analysis.worker.api import log, array, array_iterator, worker_chunks
from slycat.analysis.worker.expression import evaluator

class build_array(array):
  def __init__(self, worker_index, shape, chunk_sizes, attribute_expressions):
    array.__init__(self, worker_index)
    self.shape = shape
    self.chunk_sizes = chunk_sizes
    self.attribute_expressions = attribute_expressions
  def dimensions(self):
    return [{"name":"d%s" % index, "type":"int64", "begin":0, "end":dimension, "chunk-size":chunk_size} for index, (dimension, chunk_size) in enumerate(zip(self.shape, self.chunk_sizes))]
  def attributes(self):
    return [attribute for attribute, expression in self.attribute_expressions]
  def iterator(self):
    return self.pyro_register(build_array_iterator(self))

class symbol_lookup:
  """Helper class that looks-up expression symbols, returning array dimensions."""
  def __init__(self, iterator, dimensions):
    self.iterator = iterator
    self.dimensions = dimensions
    self.dimension_map = {dimension["name"]:index for index, dimension in enumerate(dimensions)}
  def __contains__(self, key):
    return key in self.dimension_map
  def __getitem__(self, key):
    try:
      if key in self.dimension_map:
        dimension = self.dimension_map[key]
        offset = self.iterator.coordinates()[dimension]
        shape = tuple(self.iterator.shape())
        slices = [slice(end) for end in shape]
        return offset + numpy.mgrid[slices][dimension]
    except Exception as e:
      log.error("symbol_lookup exception: %s", e)

class build_array_iterator(array_iterator):
  def __init__(self, owner):
    array_iterator.__init__(self, owner)
    self.symbol_lookup = symbol_lookup(self, self.owner.dimensions())
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
  def values(self, attribute):
    attribute, expression = self.owner.attribute_expressions[attribute]
    log.debug("Evaluating %s." % ast.dump(expression))
    return evaluator(self.symbol_lookup).evaluate(expression).astype(attribute["type"])

