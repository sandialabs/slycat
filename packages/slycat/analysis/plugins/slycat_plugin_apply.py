# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
from __future__ import division

def register_client_plugin(context):
  import slycat.analysis.plugin.client

  def apply(connection, source, attributes):
    """Add attributes based on mathmatical expressions to a source array.

    Signature: apply(source, attributes)

    Creates a copy of a source array with one-or-more
    additional attributes computed using mathematical expressions.

    The attributes parameter may be a tuple containing an attribute and an
    expression, or a sequence of attribute, expression tuples.  Each attribute
    may be an attribute name, or a tuple containing the attribute name and
    type, which otherwise defaults to float64.  Each expression must be a
    string containing valid Python syntax, and may use any of the usual Python
    operators:

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

    Expressions may refer to any of the source array dimensions or attributes
    by name.

      >>> a = random(5, attributes=["a", "b"])

      >>> scan(apply(a, ("c", "3.14")))
        {d0} a, b, c
      * {0} 0.929616092817, 0.595544702979, 3.14
        {1} 0.316375554582, 0.964514519736, 3.14
        {2} 0.183918811677, 0.653177096872, 3.14
        {3} 0.204560278553, 0.748906637534, 3.14
        {4} 0.567725029082, 0.653569870852, 3.14

      >>> scan(apply(a, ("sum", "a + b")))
        {d0} a, b, sum
      * {0} 0.929616092817, 0.595544702979, 1.5251607958
        {1} 0.316375554582, 0.964514519736, 1.28089007432
        {2} 0.183918811677, 0.653177096872, 0.837095908549
        {3} 0.204560278553, 0.748906637534, 0.953466916087
        {4} 0.567725029082, 0.653569870852, 1.22129489993

      >>> scan(apply(a, [("diff", "a - b"), (("d", "int64"), "d0 % 3")]))
        {d0} a, b, diff, d
      * {0} 0.929616092817, 0.595544702979, 0.334071389838, 0
        {1} 0.316375554582, 0.964514519736, -0.648138965154, 1
        {2} 0.183918811677, 0.653177096872, -0.469258285194, 2
        {3} 0.204560278553, 0.748906637534, -0.544346358981, 0
        {4} 0.567725029082, 0.653569870852, -0.08584484177, 1
    """
    source = slycat.analysis.plugin.client.require_array(source)
    if isinstance(attributes, tuple):
      attributes = [attributes]
    if len(attributes) < 1:
      raise slycat.analysis.plugin.client.InvalidArgument("You must specify at least one attribute.")
    attributes = [(slycat.analysis.plugin.client.require_attribute(attribute), slycat.analysis.plugin.client.require_expression(expression)) for attribute, expression in attributes]
    return connection.create_remote_array("apply", [source], attributes)
  context.register_plugin_function("apply", apply)

def register_worker_plugin(context):
  import numpy

  import slycat.analysis.plugin.worker
  import slycat.analysis.plugin.worker.expression

  def apply(factory, worker_index, source, attributes):
    return factory.pyro_register(apply_array(worker_index, factory.require_object(source), attributes))

  class apply_array(slycat.analysis.plugin.worker.array):
    def __init__(self, worker_index, source, attribute_expressions):
      slycat.analysis.plugin.worker.array.__init__(self, worker_index)
      self.source = source
      self.attribute_expressions = attribute_expressions
    def dimensions(self):
      return self.source.dimensions()
    def attributes(self):
      return self.source.attributes() + [attribute for attribute, expression in self.attribute_expressions]
    def iterator(self):
      return self.pyro_register(apply_array_iterator(self))

  class symbol_lookup:
    """Helper class that looks-up expression symbols, returning array attributes / dimensions."""
    def __init__(self, iterator, attributes, dimensions):
      self.iterator = iterator
      self.attributes = attributes
      self.dimensions = dimensions
      self.attribute_map = {attribute["name"]:index for index, attribute in enumerate(attributes)}
      self.dimension_map = {dimension["name"]:index for index, dimension in enumerate(dimensions)}
    def __contains__(self, key):
      return key in self.attribute_map or key in self.dimension_map
    def __getitem__(self, key):
      try:
        if key in self.attribute_map:
          return self.iterator.values(self.attribute_map[key])
        if key in self.dimension_map:
          dimension = self.dimension_map[key]
          offset = self.iterator.coordinates()[dimension]
          shape = tuple(self.iterator.shape())
          slices = [slice(end) for end in shape]
          return numpy.ma.asarray(offset + numpy.mgrid[slices][dimension])
      except Exception as e:
        log.error("symbol_lookup exception: %s", e)

  class apply_array_iterator(slycat.analysis.plugin.worker.array_iterator):
    def __init__(self, owner):
      slycat.analysis.plugin.worker.array_iterator.__init__(self, owner)
      self.iterator = owner.source.iterator()
      self.source_attributes = owner.source.attributes()
      self.symbol_lookup = symbol_lookup(self.iterator, self.source_attributes, owner.source.dimensions())
    def __del__(self):
      self.iterator.release()
    def next(self):
      self.iterator.next()
    def coordinates(self):
      return self.iterator.coordinates()
    def shape(self):
      return self.iterator.shape()
    def values(self, attribute):
      if attribute < len(self.source_attributes):
        return self.iterator.values(attribute)

      attribute, expression = self.owner.attribute_expressions[attribute - len(self.source_attributes)]
      #log.debug("Evaluating %s." % ast.dump(expression))
      result = slycat.analysis.plugin.worker.expression.evaluator(self.symbol_lookup).evaluate(expression)
      if isinstance(result, int) or isinstance(result, float):
        temp = numpy.ma.empty(self.iterator.shape())
        temp.fill(result)
        result = temp
      return result.astype(attribute["type"])
  context.register_plugin_function("apply", apply)
