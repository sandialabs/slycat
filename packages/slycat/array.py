# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

class InvalidArgument(Exception):
  """Exception thrown when the public API is called with invalid arguments."""
  def __init__(self, message):
    Exception.__init__(self, message)

attribute_type_map = {"int8":"int8", "int16":"int16", "int32":"int32", "int64":"int64", "uint8":"uint8", "uint16":"uint16", "uint32":"uint32", "uint64":"uint64", "float32":"float32", "float64":"float64", "string":"string", "float":"float32", "double":"float64"}

def require_attribute_name(name):
  if not isinstance(name, basestring):
    raise InvalidArgument("Attribute name must be a string.")
  return name

def require_attribute_type(type):
  if type not in require_attribute_type.allowed_types:
    raise InvalidArgument("Attribute type must be one of %s" % ",".join(require_attribute_type.allowed_types))
  return type
require_attribute_type.allowed_types = set(["int8", "int16", "int32", "int64", "uint8", "uint16", "uint32", "uint64", "float32", "float64", "string", "bool"])

def require_attribute(attribute):
  if isinstance(attribute, basestring):
    attribute = {"name":require_attribute_name(attribute), "type":"float64"}
  elif isinstance(attribute, tuple):
    if len(attribute) != 2:
      raise InvalidArgument("Attribute must have a name and a type.")
    attribute = {"name":require_attribute_name(attribute[0]), "type":require_attribute_type(attribute[1])}
  elif isinstance(attribute, dict):
    if "name" not in attribute:
      raise InvalidArgument("Attribute must have a name.")
    if "type" not in attribute:
      raise InvalidArgument("Attribute must have a type.")
    attribute = {"name":require_attribute_name(attribute["name"]), "type":require_attribute_type(attribute["type"])}
  return attribute

def require_attributes(attributes):
  if isinstance(attributes, basestring):
    attributes = [require_attribute(attributes)]
  elif isinstance(attributes, tuple):
    attributes = [require_attribute(attributes)]
  elif isinstance(attributes, dict):
    attributes = [require_attribute(attributes)]
  else:
    attributes = [require_attribute(attribute) for attribute in attributes]
  return attributes

def require_dimension_name(name):
  if not isinstance(name, basestring):
    raise InvalidArgument("Dimension name must be a string.")
  return name

def require_dimension_type(type):
  if type not in require_dimension_type.allowed_types:
    raise InvalidArgument("Dimension type must be one of %s" % ",".join(require_dimension_type.allowed_types))
  return type
require_dimension_type.allowed_types = set(["int64"])

def require_dimension_bound(bound):
  if not isinstance(bound, int):
    raise InvalidArgument("Dimension bound must be an integer.")
  return bound

def require_dimension(dimension):
  if isinstance(dimension, tuple):
    if len(dimension) != 4:
      raise InvalidArgument("Dimension must have a name, type, begin, and end")
    dimension = {"name":require_dimension_name(dimension[0]), "type":require_dimension_type(dimension[1]), "begin":require_dimension_bound(dimension[2]), "end":require_dimension_bound(dimension[3])}
  elif isinstance(dimension, dict):
    if "name" not in dimension:
      raise InvalidArgument("Dimension must have a name.")
    if "type" not in dimension:
      raise InvalidArgument("Dimension must have a type.")
    if "begin" not in dimension:
      raise InvalidArgument("Dimension must have a begin.")
    if "end" not in dimension:
      raise InvalidArgument("Dimension must have an end.")
    dimension = {"name":require_dimension_name(dimension["name"]), "type":require_dimension_type(dimension["type"]), "begin":require_dimension_bound(dimension["begin"]), "end":require_dimension_bound(dimension["end"])}
  return dimension

def require_dimensions(dimensions):
  if isinstance(dimensions, tuple):
    dimensions = [require_dimension(dimensions)]
  elif isinstance(dimensions, dict):
    dimensions = [require_dimension(dimensions)]
  else:
    dimensions = [require_dimension(dimension) for dimension in dimensions]
  return dimensions

