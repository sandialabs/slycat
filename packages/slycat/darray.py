# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

"""Functionality for working with the Python representation of a darray.

Slycat makes extensive use of `darray` objects - dense, multi-dimension,
multi-attribute arrays - as its fundamental unit of storage and organization.
In the abstract, a darray can be modeled as follows:

* A set of dimensions.  Each dimension has a name, index type, and a half-open range of valid index values.  Currently, the only supported index type is "int64", and indices are all zero-based (i.e. the range always begins at zero), but these may change in the future.  Collectively, the dimensions define the size and shape of the array.
* A set of attributes, each with a name and type.  Allowed attribute types include a full complement of signed and unsigned fixed-width integer types, plus floating-point and string types.  Collectively, attributes define *what* will be stored in the array.
* The array data.  Because darrays are dense, the data will include one value per attribute, for every location in the array.

This definition allows darrays to be flexible and efficient - for example, a
"table" data structure with heterogenous column types can be stored as a 1D
darray with multiple attributes, while a "matrix" would be stored as a 2D darray
with a single floating-point attribute.

Note that darrays are an abstract concept that can have multiple concrete
representations.  This module defines an abstract interface for manipulating
darrays from Python and a concrete implementation with in-memory storage, but
other representations are possible.  For example, :py:mod:`slycat.hdf5` defines
functionality for manipulating darrays stored in HDF5 files on disk.

Note that it is rare to manipulate entire darrays in memory at once, due to
their size.
"""

import numpy
import slycat.array

class prototype(object):
  pass

class memarray(prototype):
  """darray implementation that holds the full array contents in memory."""
  def __init__(self, dimensions, attributes, data):
    if len(dimensions) < 1:
      raise ValueError("At least one dimension is required.")
    if len(attributes) < 1:
      raise ValueError("At least one attribute is required.")
    if len(attributes) != len(data):
      raise ValueError("Attribute and data counts must match.")

    self._dimensions = [dict(name=slycat.array.require_dimension_name(dimension["name"]), type=slycat.array.require_dimension_type(dimension.get("type", "int64")), begin=slycat.array.require_dimension_bound(dimension.get("begin", 0)), end=slycat.array.require_dimension_bound(dimension["end"])) for dimension in dimensions]
    self._attributes = [dict(name=slycat.array.require_attribute_name(attribute["name"]), type=slycat.array.require_attribute_type(attribute["type"])) for attribute in attributes]
    self._data = [numpy.array(attribute) for attribute in data]

    for dimension in self._dimensions:
      if dimension["begin"] != 0:
        raise ValueError("Dimension range must begin with 0.")

    for attribute in self._data:
      if attribute.shape != self.shape:
        raise ValueError("Attribute data must match array shape.")

  @property
  def ndim(self):
    """Return the number of dimensions in the array."""
    return len(self._dimensions)

  @property
  def shape(self):
    """Return the shape (size along each dimension) of the array."""
    return tuple([dimension["end"] - dimension["begin"] for dimension in self._dimensions])

  @property
  def size(self):
    """Return the size (total number of elements) of the array."""
    return numpy.prod(self.shape)

  @property
  def dimensions(self):
    """Return a description of the array dimensions."""
    return self._dimensions

  @property
  def statistics(self):
    """Return statistics for each array attribute."""
    statistics = []
    for attribute in self._data:
      if attribute.dtype.char in ["O", "S", "U"]:
        statistics.append(dict(min=min(attribute), max=max(attribute)))
      else:
        statistics.append(dict(min=attribute.min(), max=attribute.max()))
    return statistics

  @property
  def attributes(self):
    """Return a description of the array attributes."""
    return self._attributes

  def get(self, attribute=0, slice=None):
    """Return a data slice from one attribute."""
    if slice is None:
      return self._data[attribute]
    return self._data[attribute][slice]

  def set(self, attribute, slice, data):
    """Write a data slice to one attribute."""
    self._data[attribute][slice] = data

