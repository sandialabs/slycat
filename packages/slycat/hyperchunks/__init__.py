# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

"""Functionality for working with hyperchunk specifications (collections of array/attribute/slice information)."""

import numbers
import numpy
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
  return slycat.hyperchunks.grammar.hyperchunks_p.parseString(string, parseAll=True)

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
    def __init__(self, index, attributes, hyperslices):
      self._index = index
      self._attributes = attributes
      self._hyperslices = hyperslices

    @property
    def attribute_count(self):
      return 0 if self._attributes is None else len(self._attributes)

    @property
    def index(self):
      return self._index

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
    for arrays in hyperchunk[0]:
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
          yield Array(index, hyperchunk[1] if len(hyperchunk) > 1 else None, hyperchunk[2] if len(hyperchunk) > 2 else None)
      else:
        raise ValueError("Unexpected array: %r" % arrays)

def format(hyperchunks):
  """Convert hyperchunks to their string representation.
  """
  def format_slice(value):
    if isinstance(value, numbers.Integral):
      return str(value)
    elif isinstance(value, type(Ellipsis)):
      return "..."
    elif isinstance(value, slice):
      return ("%s:%s" % ("" if value.start is None else value.start, "" if value.stop is None else value.stop)) + ("" if value.step is None else ":%s" % value.step)
    else:
      raise ValueError()

  def format_slice_or_expression(value):
    if isinstance(value, (numbers.Integral, type(Ellipsis), slice)):
      return format_slice(value)
    elif isinstance(value, slycat.hyperchunks.grammar.FunctionCall):
      return "%s(%s)" % (value._name, ",".join([repr(arg) for arg in value._args]))
    elif isinstance(value, slycat.hyperchunks.grammar.BinaryOperator):
      return "%s %s %s" % (value._left, value._operator, value._right)
    else:
      raise ValueError()

  def format_slices(values):
    return "|".join([format_slice(value) for value in values])

  def format_slices_or_expressions(values):
    return "|".join([format_slice_or_expression(value) for value in values])

  def format_hyperslice(values):
    return ",".join([format_slice(value) for value in values])

  def format_hyperslices(values):
    return "|".join([format_hyperslice(value) for value in values])

  def format_hyperchunk(hyperchunk):
    if len(hyperchunk) == 1:
      return format_slices(hyperchunk[0])
    elif len(hyperchunk) == 2:
      return format_slices(hyperchunk[0]) + "/" + format_slices_or_expressions(hyperchunk[1])
    elif len(hyperchunk) == 3:
      return format_slices(hyperchunk[0]) + "/" + format_slices_or_expressions(hyperchunk[1]) + "/" + format_hyperslices(hyperchunk[2])
    else:
      raise ValueError("%r" % hyperchunk)

  return ";".join([format_hyperchunk(hyperchunk) for hyperchunk in hyperchunks])

class HypersliceBuilder(object):
  def __getitem__(self, index):
    if isinstance(index, tuple):
      return index
    else:
      return (index,)

hyperslice = HypersliceBuilder()


def simple(array, attribute, hyperslice):
  """Return a hyperchunks object containing a single array, single attribute, and single hyperslice.

  Parameters
  ----------
  array: integer
    Zero-based index of the array to read/write.
  attribute: integer
    Zero-based index of the attribute to read/write.
  hyperslice: tuple of one-or-more slices
    Specifies a single hyperslice to read/write.
  """
  return [[[array], [slycat.hyperchunks.grammar.AttributeIndex(attribute)], [hyperslice]]]
