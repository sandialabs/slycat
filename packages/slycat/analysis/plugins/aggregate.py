# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def register_client_plugin(context):
  import slycat.analysis.client

  def aggregate(connection, source, expressions):
    """Return an array containing one-or-more aggregates of a source array.

    The result is a one-dimensional array with a single cell containing
    aggregate attributes specified via one-or-more aggregate expressions by the
    caller.  An aggregate expression can take one of three forms:

      "function"            Apply an aggregate function to every attribute in
                            the source array.
      ("function", index)   Apply an aggregate function to a single source
                            attribute, identified by its index.
      ("function", "name")  Apply an aggregate function to a single source
                            attribute, identified by its name.

    The expressions parameter accepts a single expression or a list of
    one-or-more expressions.  The available aggregate functions are:

      avg       Compute the average value of an attribute.
      count     Compute the number of values stored in an attribute.
      distinct  Compute the number of distinct values stored in an attribute.
      max       Compute the maximum value of an attribute.
      min       Compute the minimum value of an attribute.
      sum       Compute the sum of an attribute's values.

    The attribute names in the result array will be a combination of the
    function name with the attribute name:

      >>> a = random(5, attributes=["b", "c"])

      >>> scan(aggregate(a, "min"))
        {i} min_b, min_c
      * {0} 0.183918811677, 0.595544702979

      >>> scan(aggregate(a, ("avg", 0)))
        {i} avg_b
      * {0} 0.440439153342

      >>> scan(aggregate(a, ("max", "c")))
        {i} max_c
      * {0} 0.964514519736

      >>> scan(aggregate(a, ["min", "max", ("count", 0), ("sum", "c")]))
        {i} min_b, min_c, max_b, max_c, count_b, sum_c
      * {0} 0.183918811677, 0.595544702979, 0.929616092817, 0.964514519736, 5, 3.61571282797
    """
    source = slycat.analysis.client.require_array(source)
    if isinstance(expressions, basestring):
      expressions = [(expressions, None)]
    elif isinstance(expressions, tuple):
      expressions = [expressions]
    elif isinstance(expressions, list):
      expressions = [(expression, None) if isinstance(expression, basestring) else expression for expression in expressions]
    return connection.remote_array(connection.proxy.call_operator("aggregate", connection.require_object(source), expressions))
  context.add_operator("aggregate", aggregate)

def register_coordinator_plugin(context):
  import slycat.analysis.coordinator

  def aggregate(factory, source, expressions):
    source = factory.require_object(source)
    array_workers = []
    for worker_index, (source_proxy, worker) in enumerate(zip(source.workers, factory.workers())):
      array_workers.append(worker.call_operator("aggregate", worker_index, source_proxy._pyroUri, expressions))
    return factory.pyro_register(slycat.analysis.coordinator.array(array_workers, [source]))
  context.add_operator("aggregate", aggregate)

def register_worker_plugin(context):
  import numpy
  import Pyro4

  import slycat.analysis.worker
  import slycat.analysis.worker.accumulator

  def aggregate(factory, worker_index, source, expressions):
    return factory.pyro_register(aggregate_array(worker_index, factory.require_object(source), expressions))

  class aggregate_array(slycat.analysis.worker.array):
    def __init__(self, worker_index, source, expressions):
      slycat.analysis.worker.array.__init__(self, worker_index)
      self.source = source
      self.expressions = []

      source_attributes = source.attributes()
      attribute_map = dict([(attribute["name"], index) for index, attribute in enumerate(source_attributes)] + [(index, index) for index in range(len(source_attributes))])
      for operator, operand in expressions:
        if operand is None:
          for index, attribute in enumerate(source_attributes):
            self.expressions.append((operator, attribute, index))
        elif operand in attribute_map:
          self.expressions.append((operator, source_attributes[attribute_map[operand]], attribute_map[operand]))
    def dimensions(self):
      return [{"name":"i", "type":"int64", "begin":0, "end":1, "chunk-size":1}]
    def attributes(self):
      return [{"name":"%s_%s" % (operator, attribute["name"]), "type":attribute["type"]} for operator, attribute, index in self.expressions]
    def iterator(self):
      if self.worker_index == 0:
        return self.pyro_register(aggregate_array_iterator(self))
      else:
        return self.pyro_register(slycat.analysis.worker.null_array_iterator(self))
    def calculate_local(self):
      accumulators = [slycat.analysis.worker.accumulator.create(operator) for operator, attribute, index in self.expressions]
      with self.source.iterator() as source_iterator:
        for ignored in source_iterator:
          for accumulator, (operator, attribute, index) in zip(accumulators, self.expressions):
            accumulator.accumulate(source_iterator.values(index))
      return accumulators
    def calculate_global(self):
      accumulators = [Pyro4.async(sibling).calculate_local() for sibling in self.siblings]
      accumulators = [accumulator.value for accumulator in accumulators]
      accumulators = zip(*accumulators)
      global_accumulators = [slycat.analysis.worker.accumulator.create(operator) for operator, attribute, index in self.expressions]
      for local_accumulator, remote_accumulators in zip(global_accumulators, accumulators):
        for remote_accumulator in remote_accumulators:
          local_accumulator.reduce(remote_accumulator)
      return global_accumulators

  class aggregate_array_iterator(slycat.analysis.worker.array_iterator):
    def __init__(self, owner):
      slycat.analysis.worker.array_iterator.__init__(self, owner)
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
  context.add_operator("aggregate", aggregate)
