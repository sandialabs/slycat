# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

"""Functionality for working with hyperchunk specifications (collections of array/attribute/slice information)."""

import numbers
import numpy

def _format_index(index):
  if isinstance(index, numbers.Integral):
    return str(index)
  elif isinstance(index, type(Ellipsis)):
    return "..."
  elif isinstance(index, slice):
    return ("%s:%s" % ("" if index.start is None else index.start, "" if index.stop is None else index.stop)) + ("" if index.step is None else ":%s" % index.step)
  else:
    raise ValueError("Not a valid index expression: %s" % index)

def _format_index_expression(index_expression):
  return ",".join([_format_index(index) for index in index_expression])

def _validate_index_expression(index_expression):
  if not isinstance(index_expression, tuple):
    raise ValueError("An index expression must be a tuple.")
  for dimension in index_expression:
    if not isinstance(dimension, (numbers.Integral, slice, type(Ellipsis))):
      raise ValueError("Each dimension in an index expression must be an integer, slice, or Ellipsis.")
  return index_expression

class Hyperslice(object):
  """Represents a multi-dimensional array hyperslice (set of indices for every dimension in the array)."""
  def __init__(self, indices):
    self._indices = _validate_index_expression(indices)

  def __repr__(self):
    return """slycat.hyperchunks.Hyperslice("%s")""" % self.format()

  def __str__(self):
    return self.format()

  def format(self):
    return _format_index_expression(self._indices)

class Hyperslices(object):
  """Represents a collection of Hyperslice instances that all share the same number of dimensions."""
  def __init__(self):
    self._hyperslices = []

  def __len__(self):
    return len(self._hyperslices)

  def __getitem__(self, index):
    return self._hyperslices[index]

  def __repr__(self):
    return """slycat.hyperchunks.Hyperslices("%s")""" % self.format()

  def __str__(self):
    return self.format()

  def format(self):
    return "|".join([hyperslice.format() for hyperslice in self._hyperslices])

class Hyperchunk(object):
  """Represents a hyperchunk (a set of array indices, optional set of attribute indices, and zero-to-many Hyperslices instances)."""
  def __init__(self, arrays, attributes=None):
    self._arrays = _validate_index_expression(arrays)
    self._attributes = _validate_index_expression(attributes) if attributes is not None else None
    self._hyperslices = Hyperslices()

  def __repr__(self):
    return """slycat.hyperchunks.Hyperchunk("%s")""" % self.format()

  def __str__(self):
    return self.format()

  def format(self):
    sections = [_format_index_expression(self._arrays)]
    if self._attributes is not None:
      sections.append(_format_index_expression(self._attributes))
    if len(self._hyperslices):
      sections.append(self._hyperslices.format())
    return "/".join(sections)

class Hyperchunks(object):
  """Represents a collection zero-to-many Hyperchunk instances."""
  def __init__(self):
    self._hyperchunks = []

  def __len__(self):
    return len(self._hyperchunks)

  def __getitem__(self, index):
    return self._hyperchunks[index]

  def __repr__(self):
    return """slycat.hyperchunks.Hyperchunks("%s")""" % self.format()

  def __str__(self):
    return self.format()

  def format(self):
    return ";".join([hyperchunk.format() for hyperchunk in self._hyperchunks])

  def append(self, hyperchunk):
    if not isinstance(hyperchunk, Hyperchunk):
      raise ValueError("Not a hyperchunk.")
    self._hyperchunks.append(hyperchunk)

#import numbers
#
#def validate(hyperslice):
#  """Validate an object to confirm that it is a valid hyperslice."""
#  if isinstance(hyperslice, (numbers.Integral, slice, type(Ellipsis))):
#    return hyperslice
#
#  if isinstance(hyperslice, tuple):
#    for dimension in hyperslice:
#      if not isinstance(dimension, (numbers.Integral, slice, type(Ellipsis))):
#        raise ValueError("Not a valid hyperslice: %s" % hyperslice)
#    return hyperslice
#
#  raise ValueError("Not a valid hyperslice: %s" % hyperslice)
#
#def _format_dimension(dimension):
#  if isinstance(dimension, numbers.Integral):
#    return str(dimension)
#  elif isinstance(dimension, slice):
#    return ("%s:%s" % ("" if dimension.start is None else dimension.start, "" if dimension.stop is None else dimension.stop)) + ("" if dimension.step is None else ":%s" % dimension.step)
#  elif isinstance(dimension, type(Ellipsis)):
#    return "..."
#  raise ValueError("Not a valid slice: %s" % dimension)
#
#def format(hyperslice):
#  """Convert a hyperslice to a string representation.
#
#  Parameters
#  ----------
#  hyperslice : integer, slice, Ellipsis, or tuple containing any combination of integers, slices, or Ellipsis.
#    The hyperslice to be converted to a string.
#
#  Returns
#  -------
#  string
#  """
#  if isinstance(hyperslice, (numbers.Integral, slice, type(Ellipsis))):
#    return _format_dimension(hyperslice)
#  elif isinstance(hyperslice, tuple):
#    return ",".join([_format_dimension(dimension) for dimension in hyperslice])
#  raise ValueError("Not a valid hyperslice: %s" % hyperslice)
#
#def parse(hyperslice):
#  """Parse the string representation of a hyperslice.
#
#  Parameters
#  ----------
#  hyperslice : string
#    The string representation of a hyperslice.
#
#  Returns
#  -------
#  tuple containing integers, slices, or Ellipsis.
#  """
#
#  if not isinstance(hyperslice, basestring):
#    raise ValueError("An input string is required.")
#
#  result = []
#  for dimension in hyperslice.split(","):
#    if dimension == "...":
#      result.append(Ellipsis)
#    else:
#      dimension = dimension.split(":")
#      if len(dimension) == 1:
#        result.append(int(dimension[0]))
#      elif len(dimension) == 2:
#        result.append(slice(None if dimension[0] == "" else int(dimension[0]), None if dimension[1] == "" else int(dimension[1])))
#      elif len(dimension) == 3:
#        result.append(slice(None if dimension[0] == "" else int(dimension[0]), None if dimension[1] == "" else int(dimension[1]), None if dimension[2] == "" else int(dimension[2])))
#      else:
#        raise ValueError("Not a valid slice.")
#  return tuple(result)
#
