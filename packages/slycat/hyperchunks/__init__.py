# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

"""Functionality for working with hyperchunk specifications (collections of array/attribute/slice information)."""

import numbers
import numpy

class AttributeWrapper(object):
  def __init__(self, attribute, hyperslices):
    self._attribute = attribute
    self._hyperslices = hyperslices

  def __len__(self):
    return 0 if self._hyperslices is None else len(self._hyperslices)

  @property
  def index(self):
    return self._attribute

  def hyperslices(self):
    """Iterate over the hyperslices in a hyperchunk."""
    if self._hyperslices is not None:
      for hyperslice in self._hyperslices:
        yield tuple(hyperslice)

class ArrayWrapper(object):
  def __init__(self, array, attributes, hyperslices):
    self._array = array
    self._attributes = attributes
    self._hyperslices = hyperslices

  def __len__(self):
    return 0 if self._attributes is None else 1

  @property
  def index(self):
    return self._array

  def attributes(self, attribute_count):
    """Iterate over the attributes in a hyperchunk."""
    if self._attributes is not None:
      for attributes in self._attributes:
        if isinstance(attributes, numbers.Integral):
          if attributes < 0:
            attributes = slice(attribute_count + attributes, attribute_count + attributes + 1)
          else:
            attributes = slice(attributes, attributes + 1)
        elif isinstance(attributes, type(Ellipsis)):
          attributes = slice(0, attribute_count)
        start, stop, step = attributes.indices(attribute_count)
        for attribute in numpy.arange(start, stop, step):
          yield AttributeWrapper(attribute, self._hyperslices)

def arrays(hyperchunks, array_count):
  """Iterate over the arrayes in a set of hyperchunks."""
  for hyperchunk in hyperchunks:
    for arrays in hyperchunk[0]:
      if isinstance(arrays, numbers.Integral):
        if arrays < 0:
          arrays = slice(array_count + arrays, array_count + arrays + 1)
        else:
          arrays = slice(arrays, arrays + 1)
      elif isinstance(arrays, type(Ellipsis)):
        arrays = slice(0, array_count)
      start, stop, step = arrays.indices(array_count)
      for array in numpy.arange(start, stop, step):
        yield ArrayWrapper(array, hyperchunk[1] if len(hyperchunk) > 1 else None, hyperchunk[2] if len(hyperchunk) > 2 else None)

def parse(string):
  """Parse a string hyperchunks representation.

  Parameters
  ----------
  string: string representation of a hyperchunk.

  Returns
  -------
  hyperchunks: parsed representation of a hyperchunk.
  """
  from slycat.hyperchunks.grammar import hyperchunks as parser
  return parser.parseString(string, parseAll=True)

def format(hyperchunks):
  """Convert hyperchunks to their string representation.
  """
  def format_slice_expr(slice_expr):
    if isinstance(slice_expr, numbers.Integral):
      return str(slice_expr)
    elif isinstance(slice_expr, type(Ellipsis)):
      return "..."
    elif isinstance(slice_expr, slice):
      return ("%s:%s" % ("" if slice_expr.start is None else slice_expr.start, "" if slice_expr.stop is None else slice_expr.stop)) + ("" if slice_expr.step is None else ":%s" % slice_expr.step)
    else:
      raise ValueError()

  def format_slices(slices):
    return "|".join([format_slice_expr(slice_expr) for slice_expr in slices])

  def format_hyperslice(hyperslice):
    return ",".join([format_slice_expr(slice_expr) for slice_expr in hyperslice])

  def format_hyperslices(hyperslices):
    return "|".join([format_hyperslice(hyperslice) for hyperslice in hyperslices])

  def format_hyperchunk(hyperchunk):
    if len(hyperchunk) == 1:
      return format_slices(hyperchunk[0])
    elif len(hyperchunk) == 2:
      return format_slices(hyperchunk[0]) + "/" + format_slices(hyperchunk[1])
    elif len(hyperchunk) == 3:
      return format_slices(hyperchunk[0]) + "/" + format_slices(hyperchunk[1]) + "/" + format_hyperslices(hyperchunk[2])
    else:
      raise ValueError()

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
  return [[array, attribute, [hyperslice]]]
