# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
from __future__ import division

def register_client_plugin(context):
  import slycat.analysis.client

  def build(connection, shape, attributes, chunk_sizes=None):
    """Create an array with one-or-more attributes, each defined by an arbitrary expression.

    Creates an array with the given shape and chunk sizes, with one-or-more
    attributes computed using mathematical expressions.

    The shape parameter must be an int or a sequence of ints that specify the
    size of the array along each dimension.  The chunk_sizes parameter must an int
    or sequence of ints that specify the maximum size of an array chunk along
    each dimension, and must match the number of dimensions implied by the
    shape parameter.  If the chunk_sizes parameter is None (the default), the chunk
    sizes will be identical to the array shape, i.e. the array will have a
    single chunk.  This may be impractical for large arrays and prevents the
    array from being distributed across multiple workers.

    The attributes parameter may be a tuple containing an attribute and an
    expression, or a sequence of attribute, expression tuples.  Each attribute
    may be an attribute name, or a tuple containing the attribute name and
    type, which otherwise defaults to float64.  Each expression must be a
    string containing a valid Python expression, and may use any of the usual
    Python operators:

      +   Binary addition.
      &   Bitwise and (requires integer arguments).
      |   Bitwise or (requires integer arguments).
      ^   Bitwise xor (requires integer arguments).
      /   Binary division.
      //  Floor division.
      ==  Equality.
      >   Greater-than.
      >=  Greater-than or equal.
      ~   Invert / twos-complement (requires integer argument).
      <<  Left-shift (requires integer arguments).
      <   Less-than.
      <=  Less-than or equal.
      %   Modulo / remainder (requires integer arguments).
      *   Binary multiplication.
      not Boolean not.
      **  Power.
      >>  Right-shift (requires integer arguments).
      -   Binary subtraction.
      -   Negative (unary subtraction).
      +   Positive (unary addition).

    Expressions may refer to any of the array dimensions by name.

    >>> scan(build(4, ("val", "1")))
      {d0} val
    * {0} 1.0
      {1} 1.0
      {2} 1.0
      {3} 1.0

    >>> scan(build(4, ("val", "d0")))
      {d0} val
    * {0} 0.0
      {1} 1.0
      {2} 2.0
      {3} 3.0

    >>> scan(build(4, (("val", "int32"), "d0")))
      {d0} val
    * {0} 0
      {1} 1
      {2} 2
      {3} 3

      >>> scan(build(4, (("val", "int32"), "d0 ** 2")))
      {d0} val
    * {0} 0
      {1} 1
      {2} 4
      {3} 9

      >>> scan(build((3, 3), ("val", "d0 * 3 + d1")))
      {d0, d1} val
    * {0, 0} 0.0
      {0, 1} 1.0
      {0, 2} 2.0
      {1, 0} 3.0
      {1, 1} 4.0
      {1, 2} 5.0
      {2, 0} 6.0
      {2, 1} 7.0
      {2, 2} 8.0

      >>> scan(build(5, [("i", "d0"), ("i2", "d0 ** 2")]))
      {d0} i, i2
    * {0} 0.0, 0.0
      {1} 1.0, 1.0
      {2} 2.0, 4.0
      {3} 3.0, 9.0
      {4} 4.0, 16.0
    """
    shape = slycat.analysis.client.require_shape(shape)
    chunk_sizes = slycat.analysis.client.require_chunk_sizes(shape, chunk_sizes)
    if isinstance(attributes, tuple):
      attributes = [attributes]
    if len(attributes) < 1:
      raise slycat.analysis.client.InvalidArgument("You must specify at least one attribute.")
    attributes = [(slycat.analysis.client.require_attribute(attribute), slycat.analysis.client.require_expression(expression)) for attribute, expression in attributes]
    return connection.remote_array(connection.proxy.build(shape, chunk_sizes, attributes))
  context.add_operator("build", build)

def register_coordinator_plugin(context):
  import slycat.analysis.coordinator

  def build(factory, shape, chunk_sizes, attributes):
    array_workers = []
    for worker_index, worker in enumerate(factory.workers()):
      array_workers.append(worker.build(worker_index, shape, chunk_sizes, attributes))
    return factory.pyro_register(slycat.analysis.coordinator.array(array_workers, []))
  context.add_operator("build", build)

def register_worker_plugin(context):
  import numpy

  import slycat.analysis.worker
  import slycat.analysis.worker.expression

  def build(factory, worker_index, shape, chunk_sizes, attributes):
    return factory.pyro_register(build_array(worker_index, shape, chunk_sizes, attributes))

  class build_array(slycat.analysis.worker.array):
    def __init__(self, worker_index, shape, chunk_sizes, attribute_expressions):
      slycat.analysis.worker.array.__init__(self, worker_index)
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

  class build_array_iterator(slycat.analysis.worker.array_iterator):
    def __init__(self, owner):
      slycat.analysis.worker.array_iterator.__init__(self, owner)
      self.symbol_lookup = symbol_lookup(self, self.owner.dimensions())
      self.iterator = slycat.analysis.worker.worker_chunks(owner.shape, owner.chunk_sizes, len(owner.siblings))
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
      #log.debug("Evaluating %s." % ast.dump(expression))
      result = slycat.analysis.worker.expression.evaluator(self.symbol_lookup).evaluate(expression)
      if isinstance(result, int) or isinstance(result, float):
        temp = numpy.empty(self._shape)
        temp.fill(result)
        result = temp
      return result.astype(attribute["type"])
  context.add_operator("build", build)
