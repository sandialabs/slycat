# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import numpy
import Pyro4

from slycat.analysis.worker.api import log, pyro_object, array, array_iterator, null_array_iterator
import slycat.analysis.worker.accumulator

class aggregate_array(array):
  def __init__(self, worker_index, source, expressions):
    array.__init__(self, worker_index)
    self.source = source
    source_attributes = source.attributes()
    attribute_map = {attribute["name"] : index for index, attribute in enumerate(source_attributes)}
    self.expressions = [(operator, operand, attribute_map[operand], source_attributes[attribute_map[operand]]["type"]) for operator, operand in expressions if operand in attribute_map]
  def dimensions(self):
    return [{"name":"i", "type":"int64", "begin":0, "end":1, "chunk-size":1}]
  def attributes(self):
    return [{"name":"%s_%s" % (operand, operator), "type":type} for operator, operand, index, type in self.expressions]
  def iterator(self):
    if self.worker_index == 0:
      return self.pyro_register(aggregate_array_iterator(self))
    else:
      return self.pyro_register(null_array_iterator(self))
  def calculate_local(self):
    accumulators = [slycat.analysis.worker.accumulator.create(operator) for operator, operand, index, type in self.expressions]
    with self.source.iterator() as source_iterator:
      for ignored in source_iterator:
        for accumulator, (operator, operand, index, type) in zip(accumulators, self.expressions):
          accumulator.accumulate(source_iterator.values(index))
    return accumulators
  def calculate_global(self):
    accumulators = [Pyro4.async(sibling).calculate_local() for sibling in self.siblings]
    accumulators = [accumulator.value for accumulator in accumulators]
    accumulators = zip(*accumulators)
    global_accumulators = [slycat.analysis.worker.accumulator.create(operator) for operator, operand, index, type in self.expressions]
    for local_accumulator, remote_accumulators in zip(global_accumulators, accumulators):
      for remote_accumulator in remote_accumulators:
        local_accumulator.reduce(remote_accumulator)
    return global_accumulators

class aggregate_array_iterator(array_iterator):
  def __init__(self, owner):
    array_iterator.__init__(self, owner)
    self.iterations = 0
  def next(self):
    if self.iterations:
      raise StopIteration()
    self.iterations += 1
    self.accumulators = self.owner.calculate_global()
  def coordinates(self):
    return numpy.array([0], dtype="int64")
  def shape(self):
    return numpy.array([1], dtype="int64")
  def values(self, attribute):
    return numpy.array([self.accumulators[attribute].result()])

