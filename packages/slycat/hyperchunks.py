# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

"""Functionality for working with hyperchunk specifications (collections of array/attribute/slice information)."""

import numbers
import numpy

def _validate_index_expression(index_expression, dimension_count=None):
  if not isinstance(index_expression, tuple):
    raise ValueError("An index expression must be a tuple.")
  if dimension_count is not None:
    if len(index_expression) != dimension_count:
      raise ValueError("Index expression must only contain one dimension.")
  for dimension in index_expression:
    if not isinstance(dimension, (numbers.Integral, slice, type(Ellipsis))):
      raise ValueError("Each dimension in an index expression must be an integer, slice, or Ellipsis.")
  return index_expression

def _format_index_dimension(dimension):
  if isinstance(dimension, numbers.Integral):
    return str(dimension)
  elif isinstance(dimension, type(Ellipsis)):
    return "..."
  elif isinstance(dimension, slice):
    return ("%s:%s" % ("" if dimension.start is None else dimension.start, "" if dimension.stop is None else dimension.stop)) + ("" if dimension.step is None else ":%s" % dimension.step)
  else:
    raise ValueError("Not a valid index dimension: %s" % dimension)

def _format_index_expression(index_expression):
  return ",".join([_format_index_dimension(dimension) for dimension in index_expression])

def _parse_index_expression(index_expression):
  if not isinstance(index_expression, basestring):
    raise ValueError("A string is required.")

  result = []
  for dimension in index_expression.split(","):
    if dimension == "...":
      result.append(Ellipsis)
    else:
      dimension = dimension.split(":")
      if len(dimension) == 1:
        result.append(int(dimension[0]))
      elif len(dimension) == 2:
        result.append(slice(None if dimension[0] == "" else int(dimension[0]), None if dimension[1] == "" else int(dimension[1])))
      elif len(dimension) == 3:
        result.append(slice(None if dimension[0] == "" else int(dimension[0]), None if dimension[1] == "" else int(dimension[1]), None if dimension[2] == "" else int(dimension[2])))
      else:
        raise ValueError("Not a valid slice.")
  return tuple(result)



class Hyperslice(object):
  """Represents a multi-dimensional array hyperslice (set of indices for every dimension in the array)."""
  def __init__(self, *args):
    if len(args) == 1 and isinstance(args[0], basestring):
      result = []
      for dimension in args[0].split(","):
        if dimension == "...":
          result.append(Ellipsis)
        else:
          dimension = dimension.split(":")
          if len(dimension) == 1:
            result.append(int(dimension[0]))
          elif len(dimension) == 2:
            result.append(slice(None if dimension[0] == "" else int(dimension[0]), None if dimension[1] == "" else int(dimension[1])))
          elif len(dimension) == 3:
            result.append(slice(None if dimension[0] == "" else int(dimension[0]), None if dimension[1] == "" else int(dimension[1]), None if dimension[2] == "" else int(dimension[2])))
          else:
            raise ValueError()
      self._indices = tuple(result)
    elif len(args) == 1:
      if not isinstance(args[0], tuple):
        raise ValueError("Hyperslice must be a tuple.")
      for dimension in args[0]:
        if not isinstance(dimension, (numbers.Integral, slice, type(Ellipsis))):
          raise ValueError("Each dimension in a Hyperslice must be an integer, slice, or Ellipsis.")
      self._indices = args[0]
    else:
      raise ValueError()

  def __repr__(self):
    return """slycat.hyperchunks.Hyperslice("%s")""" % self.format()

  def __str__(self):
    return self.format()

  def format(self):
    return _format_index_expression(self._indices)

class Hyperslices(object):
  """Represents a collection of Hyperslice instances that all share the same number of dimensions."""
  def __init__(self, *args):
    if len(args) == 1 and isinstance(args[0], basestring):
      self._hyperslices = [Hyperslice(hyperslice) for hyperslice in args[0].split("|")]
    elif len(args) == 1:
      self._hyperslices = []
      for hyperslice in args[0]:
        self.append(hyperslice)

  def __len__(self):
    return len(self._hyperslices)

  def __getitem__(self, index):
    return self._hyperslices[index]

  def __repr__(self):
    return """slycat.hyperchunks.Hyperslices("%s")""" % self.format()

  def __str__(self):
    return self.format()

  def append(self, hyperslice):
    if not isinstance(hyperslice, Hyperslice):
      raise ValueError("Not a Hyperslice.")
    self._hyperslices.append(hyperslice)

  def format(self):
    return "|".join([hyperslice.format() for hyperslice in self._hyperslices])

class Hyperchunk(object):
  """Represents a hyperchunk (a set of array indices, optional set of attribute indices, and zero-to-many Hyperslices instances)."""
  def __init__(self, arrays, attributes=None, hyperslices=Hyperslices()):
    if isinstance(arrays, basestring):
      sections = arrays.split("/")
      if len(sections) == 1:
        self._arrays = _parse_index_expression(sections[0])
        self._attributes = None
        self._hyperslices = Hyperslices()
      elif len(sections) == 2:
        hyperchunks.append(Hyperchunk(_parse_index_expression(sections[0]), _parse_index_expression(sections[1])))
      elif len(sections) == 3:
        hyperchunks.append(Hyperchunk(_parse_index_expression(sections[0]), _parse_index_expression(sections[1]), _parse_index_expression(sections[2])))
    else:
      self._arrays = _validate_index_expression(arrays, dimension_count=1)
      self._attributes = _validate_index_expression(attributes, dimension_count=1) if attributes is not None else None
      self._hyperslices = _validate_index_expression(hyperslices)

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
  def __init__(self, *args):
    if len(args) == 1 and isinstance(args[0], basestring):
      self._hyperchunks = [Hyperchunk(hyperchunk) for hyperchunk in args[0].split(";")]
    elif len(args) == 1:
      self._hyperchunks = []
      for hyperchunk in args[0]:
        self.append(hyperchunk)
    elif len(args) == 0:
      self._hyperchunks = []
    else:
      raise ValueError()

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

