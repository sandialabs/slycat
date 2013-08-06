# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

from slycat.analysis.client import InvalidArgument

import numpy

def value(connection, source, attributes=None):
  """Returns first values (values at the lowest-numbered set of coordinates) from array attributes.

  Attributes can be specified by-index or by-name, or any mixture of the two.

  If the attributes parameter is None (the default), value() will return the
  first value from every attribute in the array.  If the array only has one
  attribute, the value will be returned directly.  If the array has multiple
  attributes, their first values will be returned as a tuple.

  If the attributes parameter is a single integer or string, a single first
  value will be returned.

  If the attributes parameter is a sequence of integers / strings, a tuple of
  first values will be returned.

  Note that extracting first values from an array means moving attribute data
  to the client, which may be impractically slow or exceed available client
  memory for large arrays.

  The value() function is primarily of use when working with arrays that
  only have one cell to begin with, such as aggregation results.
  """
  def materialize_value(iterator, attribute, source_attributes):
    """Materializes the first value of an attribute."""
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

    return numpy.nditer(iterator.values(attribute)).next().item()

  iterator = source.proxy.iterator()
  source_attributes = source.attributes
  try:
    iterator.next()
    if attributes is None:
      if len(source_attributes) == 1:
        results = materialize_value(iterator, 0, source_attributes)
      else:
        results = tuple([materialize_value(iterator, attribute, source_attributes) for attribute in range(len(source_attributes))])
    elif isinstance(attributes, list) or isinstance(attributes, tuple):
      return tuple([materialize_value(iterator, attribute, source_attributes) for attribute in attributes])
    else:
      return materialize_value(iterator, attributes, source_attributes)
    iterator.release()
    return results
  except StopIteration:
    iterator.release()
  except:
    iterator.release()
    raise

def register_client_plugin(context):
  context.add_operator("value", value)
