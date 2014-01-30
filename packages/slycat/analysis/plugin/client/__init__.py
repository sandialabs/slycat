import logging

handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))

log = logging.getLogger("slycat.analysis.client")
log.setLevel(logging.INFO)
log.addHandler(handler)

from slycat.data.array import *

def require_attribute_names(names):
  if isinstance(names, basestring):
    return [require_attribute_name(names)]
  return [require_attribute_name(name) for name in names]

def require_chunk_size(chunk_size):
  if not isinstance(chunk_size, int):
    raise slycat.analysis.client.InvalidArgument("Chunk size must be an integer.")
  if chunk_size < 1:
    raise slycat.analysis.client.InvalidArgument("Chunk size must be greater-than zero.")
  return chunk_size

def require_chunk_sizes(shape, chunk_sizes):
  """Return array chunk sizes (tuple of dimension lengths), treating a single integer as a 1-tuple and sanity-checking the results against an array shape."""
  if chunk_sizes is None:
    chunk_sizes = shape
  elif isinstance(chunk_sizes, int):
    chunk_sizes = tuple([require_chunk_size(chunk_sizes)])
  else:
    chunk_sizes = tuple([require_chunk_size(chunk_size) for chunk_size in chunk_sizes])
  if len(shape) != len(chunk_sizes):
    raise InvalidArgument("Array shape and chunk sizes must contain the same number of dimensions.")
  return chunk_sizes

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



