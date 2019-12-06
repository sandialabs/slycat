# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

"""Slycat makes extensive use of `darray` objects - dense, multi-dimension,
multi-attribute arrays - as its fundamental unit of storage and organization.
In the abstract, a darray can be modeled as follows:

* A set of dimensions.  Each dimension has a name, index type, and a half-open range of valid index values.  Currently, the only supported index type is "int64", and indices are all zero-based (i.e. the range always begins at zero), but these may change in the future.  Collectively, the dimensions define the size and shape of the array.
* A set of attributes, each with a name and type.  Allowed attribute types include a full complement of signed and unsigned fixed-width integer types, plus floating-point and string types.  Collectively, attributes define *what* will be stored in the array.
* The array data.  Because darrays are dense, the data will include one value per attribute, for every location in the array.

This definition allows darrays to be flexible and efficient - for example, a
"table" data structure with heterogenous column types can be stored as a 1D
darray with multiple attributes, while a "matrix" would be stored as a 2D darray
with a single floating-point attribute.

Note that darrays are an abstract concept with multiple concrete
representations.  This module defines an abstract interface for manipulating
Python darrays, and a concrete implementation with in-memory storage.  The
:py:mod:`slycat.hdf5` module defines functionality for manipulating darrays
stored in HDF5 files on disk, and the :ref:`rest-api` defines functionality
for working with darrays using HTTP.

Note that it is rare to manipulate entire darrays in memory at once, due to
their size - most applications will work with *slices* of a darray to keep
memory use manageable.
"""

import numpy
import cherrypy


class Prototype(object):
  """Abstract interface for all darray implementations."""
  @property
  def ndim(self):
    """Return the number of dimensions in the array."""
    raise NotImplementedError()

  @property
  def shape(self):
    """Return the shape (size along each dimension) of the array."""
    raise NotImplementedError()

  @property
  def size(self):
    """Return the size (total number of elements) of the array."""
    raise NotImplementedError()

  @property
  def dimensions(self):
    """Return a description of the array dimensions."""
    raise NotImplementedError()

  @property
  def attributes(self):
    """Return a description of the array attributes."""
    raise NotImplementedError()

  def get_statistics(self, attribute=0):
    """Return statistics describing one attribute."""
    raise NotImplementedError()

  def get_data(self, attribute=0):
    """Return data from one attribute."""
    raise NotImplementedError()

  def set_data(self, attribute, slice, data):
    """Write data to one attribute."""
    raise NotImplementedError()

class Stub(Prototype):
  """darray implementation that only stores array metadata (dimensions and attributes)."""
  def __init__(self, dimensions, attributes):
    if len(dimensions) < 1:
      cherrypy.log.error("darray.py Stub.__init__", "At least one dimension is required.")
      raise ValueError("At least one dimension is required.")
    if len(attributes) < 1:
      cherrypy.log.error("darray.py Stub.__init__", "At least one attribute is required.")
      raise ValueError("At least one attribute is required.")

    self._dimensions = [dict(name=_require_dimension_name(dimension["name"]), type=_require_dimension_type(dimension.get("type", "int64")), begin=_require_dimension_bound(dimension.get("begin", 0)), end=_require_dimension_bound(dimension["end"])) for dimension in dimensions]
    self._attributes = [dict(name=_require_attribute_name(attribute["name"]), type=_require_attribute_type(attribute["type"])) for attribute in attributes]

    for dimension in self._dimensions:
      if dimension["begin"] != 0:
        cherrypy.log.error("darray.py Stub.__init__", "Dimension range must being with 0.")
        raise ValueError("Dimension range must begin with 0.")

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
  def attributes(self):
    """Return a description of the array attributes."""
    return self._attributes

class MemArray(Stub):
  """darray implementation that holds the full array contents in memory."""
  def __init__(self, dimensions, attributes, data):
    Stub.__init__(self, dimensions, attributes)

    if len(attributes) != len(data):
      cherrypy.log.error("darray.py MemArray.__init__", "Attribute and data counts must match.")
      raise ValueError("Attribute and data counts must match.")

    self._data = [numpy.array(attribute) for attribute in data]

    for attribute in self._data:
      if attribute.shape != self.shape:
        cherrypy.log.error("darray.py MemArray.__init__", "Attribute data must match array shape.")
        raise ValueError("Attribute data must match array shape.")

  def get_statistics(self, attribute=0):
    """Return statistics describing one attribute."""
    attribute = self._data[attribute]

    if attribute.dtype.char in ["O", "S", "U"]:
      return dict(min=min(attribute), max=max(attribute))

    attribute = attribute[numpy.invert(numpy.isnan(attribute))]
    if len(attribute):
      return dict(min=attribute.min(), max=attribute.max())

    return dict(min=None, max=None)

  def get_data(self, attribute=0):
    """Return a data slice from one attribute."""
    return self._data[attribute]

  def set_data(self, attribute, slice, data):
    """Write a data slice to one attribute."""
    self._data[attribute][slice] = data

def _require_attribute_name(name):
  if not isinstance(name, str):
    cherrypy.log.error("darray.py _require_attribute_name", "Attribute name must be a string.")
    raise ValueError("Attribute name must be a string.")
  return name

def _require_attribute_type(type):
  if type not in _require_attribute_type.allowed_types:
    cherrypy.log.error("darray.py _require_attribute_type", "Attribute type must be one of %s" % ",".join(_require_attribute_type.allowed_types))
    raise ValueError("Attribute type must be one of %s" % ",".join(_require_attribute_type.allowed_types))
  return type
_require_attribute_type.allowed_types = set(["int8", "int16", "int32", "int64", "uint8", "uint16", "uint32", "uint64", "float32", "float64", "string", "bool"])

def _require_dimension_name(name):
  if not isinstance(name, str):
    cherrypy.log.error("darray.py _require_attribute_name", "Dimension name must be a string.")
    raise ValueError("Dimension name must be a string.")
  return name

def _require_dimension_type(type):
  if type not in _require_dimension_type.allowed_types:
    cherrypy.log.error("darray.py _require_dimension_type", "Dimension type must be one of %s" % ",".join(_require_dimension_type.allowed_types))
    raise ValueError("Dimension type must be one of %s" % ",".join(_require_dimension_type.allowed_types))
  return type
_require_dimension_type.allowed_types = set(["int64"])

def _require_dimension_bound(bound):
  if not isinstance(bound, int) and type(bound) is not numpy.int64:
    cherrypy.log.error("darray.py _require_dimension_bound", "Dimension bound must be an integer.")
    raise ValueError("Dimension bound must be an integer.")
  return bound

