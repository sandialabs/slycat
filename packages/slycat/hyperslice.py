# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

"""Functionality for working with hyperslices (Python slices generalized to multiple dimensions)."""

import numbers

def validate(hyperslice):
  """Validate an object to confirm that it is a valid hyperslice."""
  if isinstance(hyperslice, (numbers.Integral, slice, type(Ellipsis))):
    return hyperslice

  if isinstance(hyperslice, tuple):
    for dimension in hyperslice:
      if not isinstance(dimension, (numbers.Integral, slice, type(Ellipsis))):
        raise ValueError("Not a valid hyperslice: %s" % hyperslice)
    return hyperslice

  raise ValueError("Not a valid hyperslice: %s" % hyperslice)

def _format_dimension(dimension):
  if isinstance(dimension, numbers.Integral):
    return str(dimension)
  elif isinstance(dimension, slice):
    return ("%s:%s" % ("" if dimension.start is None else dimension.start, "" if dimension.stop is None else dimension.stop)) + ("" if dimension.step is None else ":%s" % dimension.step)
  elif isinstance(dimension, type(Ellipsis)):
    return "..."
  raise ValueError("Not a valid slice: %s" % dimension)

def format(hyperslice):
  """Convert a hyperslice to a string representation.

  Parameters
  ----------
  hyperslice : integer, slice, Ellipsis, or tuple containing any combination of integers, slices, or Ellipsis.
    The hyperslice to be converted to a string.

  Returns
  -------
  string
  """
  if isinstance(hyperslice, (numbers.Integral, slice, type(Ellipsis))):
    return _format_dimension(hyperslice)
  elif isinstance(hyperslice, tuple):
    return ",".join([_format_dimension(dimension) for dimension in hyperslice])
  raise ValueError("Not a valid hyperslice: %s" % hyperslice)

def parse(hyperslice):
  """Parse the string representation of a hyperslice.

  Parameters
  ----------
  hyperslice : string
    The string representation of a hyperslice.

  Returns
  -------
  tuple containing integers, slices, or Ellipsis.
  """

  if not isinstance(hyperslice, basestring):
    raise ValueError("An input string is required.")

  result = []
  for dimension in hyperslice.split(","):
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

