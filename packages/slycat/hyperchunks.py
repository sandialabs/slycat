# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

"""Functionality for working with hyperchunk specifications (collections of array/attribute/slice information)."""

import numbers
import numpy

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

def _validate_index_expression(index_expression, dimension_count=None):
  if not isinstance(index_expression, tuple):
    raise ValueError("An index expression must be a tuple.")
  if dimension_count is not None:
    if len(index_expression) != dimension_count:
      raise ValueError("Index expression must contain %s dimensions." % (dimension_count))
  for dimension in index_expression:
    if not isinstance(dimension, (numbers.Integral, slice, type(Ellipsis))):
      raise ValueError("Each dimension in an index expression must be an integer, slice, or Ellipsis.")
  return index_expression



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
      self._index = tuple(result)
    elif len(args) == 1:
      self._index = _validate_index_expression(args[0])
    else:
      raise ValueError()

  def __repr__(self):
    return """slycat.hyperchunks.Hyperslice("%s")""" % self.format()

  def __str__(self):
    return self.format()

  @property
  def index(self):
    return self._index

  def format(self):
    return _format_index_expression(self._index)

class Hyperslices(object):
  """Represents a collection of Hyperslice instances that all share the same number of dimensions."""
  def __init__(self, *args):
    if len(args) == 1 and isinstance(args[0], basestring):
      self._hyperslices = [Hyperslice(hyperslice) for hyperslice in args[0].split("|")]
    elif len(args) == 1:
      self._hyperslices = []
      for hyperslice in args[0]:
        self.append(hyperslice)
    elif len(args) == 0:
      self._hyperslices = []

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
  def __init__(self, *args):
    if len(args) == 1 and isinstance(args[0], basestring):
      sections = args[0].split("/")
      if len(sections) == 1:
        self._arrays = _validate_index_expression(_parse_index_expression(sections[0]), dimension_count=1)
        self._attributes = None
        self._hyperslices = None
      elif len(sections) == 2:
        self._arrays = _validate_index_expression(_parse_index_expression(sections[0]), dimension_count=1)
        self._attributes = _validate_index_expression(_parse_index_expression(sections[1]), dimension_count=1)
        self._hyperslices = None
      elif len(sections) == 3:
        self._arrays = _validate_index_expression(_parse_index_expression(sections[0]), dimension_count=1)
        self._attributes = _validate_index_expression(_parse_index_expression(sections[1]), dimension_count=1)
        self._hyperslices = Hyperslices(sections[2])
    elif len(args) == 1:
      self._arrays = _validate_index_expression(args[0], dimension_count=1)
      self._attributes = None
      self._hyperslices = None
    elif len(args) == 2:
      self._arrays = _validate_index_expression(args[0], dimension_count=1)
      self._attributes = _validate_index_expression(args[1], dimension_count=1)
      self._hyperslices = None
    elif len(args) == 3:
      self._arrays = _validate_index_expression(args[0], dimension_count=1)
      self._attributes = _validate_index_expression(args[1], dimension_count=1)
      self._hyperslices = Hyperslices(args[2])
    else:
      raise ValueError()

  def __repr__(self):
    return """slycat.hyperchunks.Hyperchunk("%s")""" % self.format()

  def __str__(self):
    return self.format()

  @property
  def arrays(self):
    return self._arrays

  @property
  def attributes(self):
    return self._attributes

  @property
  def hyperslices(self):
    return self._hyperslices

  def format(self):
    sections = [_format_index_expression(self._arrays)]
    if self._attributes is not None:
      sections.append(_format_index_expression(self._attributes))
    if self._hyperslices is not None:
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

  class AttributeWrapper(object):
    def __init__(self, attribute, hyperslices):
      self._attribute = attribute
      self._hyperslices = hyperslices

    @property
    def index(self):
      return self._attribute

    def hyperslices(self):
      if self._hyperslices is not None:
        for hyperslice in self._hyperslices:
          yield hyperslice.index

  class ArrayWrapper(object):
    def __init__(self, array, attributes, hyperslices):
      self._array = array
      self._attributes = attributes
      self._hyperslices = hyperslices

    @property
    def index(self):
      return self._array

    def attributes(self, attribute_count):
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
            yield Hyperchunks.AttributeWrapper(attribute, self._hyperslices)

  def arrays(self, array_count):
    for hyperchunk in self._hyperchunks:
      for arrays in hyperchunk.arrays:
        if isinstance(arrays, numbers.Integral):
          if arrays < 0:
            arrays = slice(array_count + arrays, array_count + arrays + 1)
          else:
            arrays = slice(arrays, arrays + 1)
        elif isinstance(arrays, type(Ellipsis)):
          arrays = slice(0, array_count)
        start, stop, step = arrays.indices(array_count)
        for array in numpy.arange(start, stop, step):
          yield Hyperchunks.ArrayWrapper(array, hyperchunk.attributes, hyperchunk.hyperslices)
