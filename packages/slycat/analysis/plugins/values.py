# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

from slycat.analysis.client import InvalidArgument
import numpy
import time

def values(connection, source, attributes=None):
  """Convert array attributes into numpy arrays.

  Signature: values(source, attributes=None)

  Attributes can be specified by-index or by-name, or any mixture of the two.

  If the attributes parameter is None (the default), values() will return
  every attribute in the array.  If the array has a single attribute, it will
  be returned as a single numpy array.  If the array has multiple attributes,
  they will be returned as a tuple of numpy arrays.

  If the attributes parameter is a single integer or string, a single numpy
  array will be returned.

  If the attributes parameter is a sequence of integers / strings, a tuple of
  numpy arrays will be returned.

  Note that converting an attribute from an array means moving all the
  attribute data to the client, which may be impractically slow or exceed
  available client memory for large arrays.
  """
  def materialize_attribute(attribute, source_attributes):
    """Materializes one attribute into a numpy array."""
    # Convert attribute names into indices ...
    if isinstance(attribute, basestring):
      for index, source_attribute in enumerate(source_attributes):
        if source_attribute["name"] == attribute:
          attribute = index
          break
      else:
        raise InvalidArgument("Unknown attribute name: {}".format(attribute))
    elif isinstance(attribute, int):
      if attribute >= len(source_attributes):
        raise InvalidArgument("Attribute index out-of-bounds: {}".format(attribute))
    else:
      raise InvalidArgument("Attribute must be an integer index or a name: {}".format(attribute))

    # Materialize every chunk into memory ...
    chunk_coordinates = []
    chunk_values = []
    iterator = source.proxy.iterator()
    try:
      while True:
        iterator.next()
        chunk_coordinates.append(iterator.coordinates())
        chunk_values.append(iterator.values(attribute))
    except StopIteration:
      iterator.release()
    except:
      iterator.release()
      raise

    # Calculate a compatible dtype for the result array (this would be easy,
    # except we have to handle string arrays, where each chunk may contain
    # different fixed-width string dtypes).
    result_type = numpy.result_type(*[values.dtype for values in chunk_values])

    # Create the result array and populate it ...
    result = numpy.ma.empty(source.shape, dtype=result_type)
    for coordinates, values in zip(chunk_coordinates, chunk_values):
      hyperslice = [slice(coordinate, coordinate + values.shape[index]) for index, coordinate in enumerate(coordinates)]
      result[hyperslice] = values
    return result

  start_time = time.time()

  source_attributes = source.attributes
  if attributes is None:
    if len(source_attributes) == 1:
      return materialize_attribute(0, source_attributes)
    else:
      return tuple([materialize_attribute(attribute, source_attributes) for attribute in range(len(source_attributes))])
  elif isinstance(attributes, list) or isinstance(attributes, tuple):
    return tuple([materialize_attribute(attribute, source_attributes) for attribute in attributes])
  else:
    return materialize_attribute(attributes, source_attributes)

  log.info("elapsed time: %s seconds" % (time.time() - start_time))
  return result

def register_client_plugin(context):
  context.register_plugin_function("values", values)
