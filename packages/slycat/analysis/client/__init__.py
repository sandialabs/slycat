class InvalidArgument(Exception):
  """Exception thrown when the public API is called with invalid arguments."""
  def __init__(self, message):
    Exception.__init__(self, message)

def require_attribute_name(name):
  if not isinstance(name, basestring):
    raise InvalidArgument("Attribute name must be a string.")
  return name

def require_attribute_type(type):
  allowed_types = ["int8", "int16", "int32", "int64", "uint8", "uint16", "uint32", "uint64", "float32", "float64", "string"]
  if type not in allowed_types:
    raise InvalidArgument("Attribute type must be one of %s" % ",".join(allowed_types))
  return type

def require_attribute(attribute):
  if isinstance(attribute, basestring):
    attribute = {"name":attribute, "type":"float64"}
  elif isinstance(attribute, tuple):
    if len(attribute) != 2:
      raise InvalidArgument("Attribute must have a name and a type.")
    attribute = {"name":attribute[0], "type":attribute[1]}
  elif isinstance(attribute, dict):
    if "name" not in attribute:
      raise InvalidArgument("Attribute must have a name.")
    if "type" not in attribute:
      raise InvalidArgument("Attribute must have a type.")
  require_attribute_name(attribute["name"])
  require_attribute_type(attribute["type"])
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

def require_attribute_names(names):
  if isinstance(names, basestring):
    return [require_attribute_name(names)]
  return [require_attribute_name(name) for name in names]

def require_chunk_sizes(shape, chunk_sizes):
  """Return array chunk sizes (tuple of dimension lengths), treating a single integer as a 1-tuple and sanity-checking the results against an array shape."""
  if chunk_sizes is None:
    chunk_sizes = shape
  elif isinstance(chunk_sizes, int):
    chunk_sizes = tuple([chunk_sizes])
  else:
    chunk_sizes = tuple(chunk_sizes)
  if len(shape) != len(chunk_sizes):
    raise InvalidArgument("Array shape and chunk sizes must contain the same number of dimensions.")
  return chunk_sizes

def require_dimension_name(name):
  if not isinstance(name, basestring):
    raise InvalidArgument("Dimension name must be a string.")
  return name

def require_dimension_names(names):
  if isinstance(names, basestring):
    return [require_dimension_name(names)]
  return [require_dimension_name(name) for name in names]

def require_expression(expression):
  import ast
  if isinstance(expression, basestring):
    expression = ast.parse(expression)
  else:
    raise InvalidArgument("Expression must be a string.")
  return expression

def require_array(array):
  return array

def require_shape(shape):
  """Return an array shape (tuple of dimension lengths), treating a single integer as a 1-tuple."""
  if isinstance(shape, int):
    shape = tuple([shape])
  else:
    shape = tuple(shape)
  if not len(shape):
    raise InvalidArgument("Array shape must have at least one dimension.")
  return shape



