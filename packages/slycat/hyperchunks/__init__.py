# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

"""Functionality for working with hyperchunk specifications (collections of array/attribute/slice information)."""

import numbers
import numpy
import cherrypy
import slycat.hyperchunks.grammar


def parse(string):
  """Parse a string hyperchunks representation.

  Parameters
  ----------
  string: string representation of a hyperchunk.

  Returns
  -------
  hyperchunks: parsed representation of a hyperchunk.
  """
  cherrypy.log.error(string)
  parsed_hyperchuncks = slycat.hyperchunks.grammar.hyperchunks_p.parseString(string, parseAll=True).asList()
  return slycat.hyperchunks.grammar.Hyperchunks(parsed_hyperchuncks)

def arrays(hyperchunks, array_count):
  """Iterate over the arrays in a set of hyperchunks."""
  class Attribute(object):
    def __init__(self, expression, hyperslices):
      self._expression = expression
      self._hyperslices = hyperslices

    @property
    def expression(self):
      return self._expression

    @property
    def hyperslice_count(self):
      return 0 if self._hyperslices is None else len(self._hyperslices)

    def hyperslices(self):
      """Iterate over the hyperslices in a hyperchunk."""
      if self._hyperslices is not None:
        for hyperslice in self._hyperslices:
          yield tuple(hyperslice)

  class Array(object):
    def __init__(self, index, attributes, order, hyperslices):
      self._index = index
      self._attributes = attributes
      self._order = order
      self._hyperslices = hyperslices

    @property
    def index(self):
      return self._index

    @property
    def attribute_count(self):
      return 0 if self._attributes is None else len(self._attributes)

    @property
    def order(self):
      return self._order

    def attributes(self, attribute_count):
      """Iterate over the attributes in a hyperchunk."""
      if self._attributes is not None:
        for attributes in self._attributes:
          if isinstance(attributes, (numbers.Integral, type(Ellipsis), slice)):
            if isinstance(attributes, numbers.Integral):
              if attributes < 0:
                attributes = slice(attribute_count + attributes, attribute_count + attributes + 1)
              else:
                attributes = slice(attributes, attributes + 1)
            elif isinstance(attributes, type(Ellipsis)):
              attributes = slice(0, attribute_count)
            start, stop, step = attributes.indices(attribute_count)
            for index in numpy.arange(start, stop, step):
              yield Attribute(slycat.hyperchunks.grammar.AttributeIndex(index), self._hyperslices)
          else:
            yield Attribute(attributes, self._hyperslices)

  for hyperchunk in hyperchunks:
    for arrays in hyperchunk.arrays:
      if isinstance(arrays, (numbers.Integral, type(Ellipsis), slice)):
        if isinstance(arrays, numbers.Integral):
          if arrays < 0:
            arrays = slice(array_count + arrays, array_count + arrays + 1)
          else:
            arrays = slice(arrays, arrays + 1)
        elif isinstance(arrays, type(Ellipsis)):
          arrays = slice(0, array_count)
        start, stop, step = arrays.indices(array_count)
        for index in numpy.arange(start, stop, step):
          yield Array(index, hyperchunk.attributes, hyperchunk.order, hyperchunk.hyperslices)
      else:
        cherrypy.log.error("hyperchunks.__init__.py", "Unexpected array: %r" % arrays)
        raise ValueError("Unexpected array: %r" % arrays)

def tostring(value):
  """Convert hyperchunks to their string representation.
  """

  if isinstance(value, slycat.hyperchunks.grammar.Arrays):
    return "|".join([tostring(array) for array in value])

  if isinstance(value, slycat.hyperchunks.grammar.Attributes):
    return "|".join([tostring(array) for array in value])

  if isinstance(value, slycat.hyperchunks.grammar.AttributeIndex):
    return "a%s" % value.index

  if isinstance(value, slycat.hyperchunks.grammar.BinaryOperator):
    return "(" + (" %s " % value.operator).join([tostring(operand) for operand in value.operands]) + ")"

  if isinstance(value, slycat.hyperchunks.grammar.FunctionCall):
    return "%s(%s)" % (value.name, ", ".join([tostring(arg) for arg in value.args]))

  if isinstance(value, slycat.hyperchunks.grammar.Hyperchunk):
    sections = []
    sections.append(tostring(value.arrays))
    if value.attributes is not None:
      sections.append(tostring(value.attributes))
    if value.order is not None:
      sections.append("order:" + tostring(value.order))
    if value.hyperslices is not None:
      sections.append(tostring(value.hyperslices))
    return "/".join(sections)

  if isinstance(value, slycat.hyperchunks.grammar.Hyperchunks):
    return ";".join([tostring(hyperchunk) for hyperchunk in value])

  if isinstance(value, slycat.hyperchunks.grammar.Hyperslices):
    return "|".join([tostring(array) for array in value])

  if isinstance(value, slycat.hyperchunks.grammar.Hyperslice):
    return ",".join([tostring(hyperslice) for hyperslice in value])

  if isinstance(value, slycat.hyperchunks.grammar.List):
    return "[%s]" % ", ".join([tostring(item) for item in value.values])

  if isinstance(value, int):
    return repr(value)

  if isinstance(value, float):
    return repr(value)

  if isinstance(value, str):
    return '"%s"' % value

  if isinstance(value, type(Ellipsis)):
    return "..."

  if isinstance(value, slice):
    return ("%s:%s" % ("" if value.start is None else value.start, "" if value.stop is None else value.stop)) + ("" if value.step is None else ":%s" % value.step)

  cherrypy.log.error("hyperchunks.__init__.py", "Unknown value: %s" % value)
  raise ValueError("Unknown value: %s" % value)

