import h5py
import numpy
import os
import slycat.array
import slycat.darray

class darray(slycat.darray.prototype):
  """Slycat darray implementation that stores data in an HDF5 file."""
  def __init__(self, file, index):
    self._storage = file["array/%s" % index]

class arrayset(object):
  def __init__(self, file):
    if not isinstance(file, h5py.File):
      raise ValueError("An open h5py.File is required.")
    self._storage = file

  def start_array(self, array_index, dimensions, attributes):
    """Add an uninitialized darray to the arrayset.

    Any existing array with the same index will be overwritten.
    """
    dimensions = slycat.array.require_dimensions(dimensions)
    attributes = slycat.array.require_attributes(attributes)
    shape = [dimension["end"] - dimension["begin"] for dimension in dimensions]
    stored_types = [dtype(attribute["type"]) for attribute in attributes]

    # Allocate space for the coming data ...
    array_key = "array/%s" % array_index
    if array_key in self._storage:
      del self._storage[array_key]
    for attribute_index, stored_type in enumerate(stored_types):
      self._storage.create_dataset("array/%s/attribute/%s" % (array_index, attribute_index), shape, dtype=stored_type)

    # Store array metadata ...
    array_metadata = self._storage[array_key].create_group("metadata")
    array_metadata["attribute-names"] = numpy.array([attribute["name"] for attribute in attributes], dtype=h5py.special_dtype(vlen=unicode))
    array_metadata["attribute-types"] = numpy.array([attribute["type"] for attribute in attributes], dtype=h5py.special_dtype(vlen=unicode))
    array_metadata["dimension-names"] = numpy.array([dimension["name"] for dimension in dimensions], dtype=h5py.special_dtype(vlen=unicode))
    array_metadata["dimension-types"] = numpy.array([dimension["type"] for dimension in dimensions], dtype=h5py.special_dtype(vlen=unicode))
    array_metadata["dimension-begin"] = numpy.array([dimension["begin"] for dimension in dimensions], dtype="int64")
    array_metadata["dimension-end"] = numpy.array([dimension["end"] for dimension in dimensions], dtype="int64")

    return darray(self._storage, array_index)

  def store_array(self, array_index, array):
    """Add an existing darray to the arrayset.

    Any existing array with the same index will be overwritten.

    Parameters
    ----------
    array_index : integer
      The index of the array to be created / overwritten.
    array : :class:`slycat.darray.prototype`
      Existing darray to be stored.
    """
    if not isinstance(array, slycat.darray.prototype):
      raise ValueError("A slycat.darray is required.")

    index = tuple([slice(dimension["begin"], dimension["end"]) for dimension in array.dimensions])

    self.start_array(array_index, array.dimensions, array.attributes)
    for attribute_index, attribute in enumerate(array.attributes):
      stored_type = dtype(attribute["type"])
      data = array.get(attribute_index)
      statistics = array.statistics[attribute_index]

      # Store the data ...
      attribute_key = "array/%s/attribute/%s" % (array_index, attribute_index)
      hdf5_attribute = self._storage[attribute_key]
      hdf5_attribute[index] = data
      hdf5_attribute.attrs["min"] = statistics["min"]
      hdf5_attribute.attrs["max"] = statistics["max"]

###############################################################################################################################################3
# Legacy functionality - these functions shouldn't be necessary in new code.

def dtype(type):
  """Convert a string attribute type into a dtype suitable for use with h5py."""
  if type not in dtype.type_map.keys():
    raise Exception("Unsupported type: {}".format(type))
  return dtype.type_map[type]
dtype.type_map = {"int8":"int8", "int16":"int16", "int32":"int32", "int64":"int64", "uint8":"uint8", "uint16":"uint16", "uint32":"uint32", "uint64":"uint64", "float32":"float32", "float64":"float64", "string":h5py.special_dtype(vlen=unicode), "float":"float32", "double":"float64"}

def path(array, directory):
  return os.path.join(directory, array[0:2], array[2:4], array[4:6], array + ".hdf5")

def open(path, mode="r"):
  return h5py.File(path, mode)

def raw_array_metadata(file, array_index):
  metadata = file["array/%s" % array_index].get("metadata", None)
  if metadata is None:
    metadata = file["array/%s" % array_index].attrs
  return metadata

def start_array_set(path):
  """Create a new array set.

  Returns a newly opened instance of h5py.File.
  """
  return h5py.File(path, "w")

def start_array(file, array_index, attributes, dimensions):
  """Add an array to an existing array set."""
  attributes = slycat.array.require_attributes(attributes)
  dimensions = slycat.array.require_dimensions(dimensions)
  stored_types = [dtype(attribute["type"]) for attribute in attributes]
  shape = [dimension["end"] - dimension["begin"] for dimension in dimensions]

  # Allocate space for the coming data ...
  array_key = "array/{}".format(array_index)
  if array_key in file:
    del file[array_key]
  for attribute_index, stored_type in enumerate(stored_types):
    file.create_dataset("array/{}/attribute/{}".format(array_index, attribute_index), shape, dtype=stored_type)

  # Store array metadata ...
  array_metadata = file[array_key].create_group("metadata")
  array_metadata["attribute-names"] = numpy.array([attribute["name"] for attribute in attributes], dtype=h5py.special_dtype(vlen=unicode))
  array_metadata["attribute-types"] = numpy.array([attribute["type"] for attribute in attributes], dtype=h5py.special_dtype(vlen=unicode))
  array_metadata["dimension-names"] = numpy.array([dimension["name"] for dimension in dimensions], dtype=h5py.special_dtype(vlen=unicode))
  array_metadata["dimension-types"] = numpy.array([dimension["type"] for dimension in dimensions], dtype=h5py.special_dtype(vlen=unicode))
  array_metadata["dimension-begin"] = numpy.array([dimension["begin"] for dimension in dimensions], dtype="int64")
  array_metadata["dimension-end"] = numpy.array([dimension["end"] for dimension in dimensions], dtype="int64")

def store_array_attribute(file, array_index, attribute_index, ranges, data):
  """Store attribute data in an existing array."""
  array_key = "array/{}".format(array_index)
  attribute_key = "array/{}/attribute/{}".format(array_index, attribute_index)
  array_metadata = raw_array_metadata(file, array_index)
  if not (0 <= attribute_index and attribute_index < len(array_metadata["attribute-names"])):
    raise Exception("Attribute index {} out-of-range.".format(attribute_index))
  stored_type = dtype(array_metadata["attribute-types"][attribute_index])

  if len(ranges) != len(array_metadata["dimension-begin"]):
    raise Exception("Expected {} dimensions, got {}.".format(len(array_metadata["dimension-begin"]), len(ranges)))
  for dimension_begin, dimension_end, (range_begin, range_end) in zip(array_metadata["dimension-begin"], array_metadata["dimension-end"], ranges):
    if not (dimension_begin <= range_begin and range_begin <= dimension_end):
      raise Exception("Begin index {} out-of-range.".format(begin))
    if not (range_begin <= range_end and range_end <= dimension_end):
      raise Exception("End index {} out-of-range.".format(end))

  if data.shape != tuple([end - begin for begin, end in ranges]):
    raise Exception("Data and range shapes don't match.")

  # Store the data ...
  attribute = file[attribute_key]
  index = tuple([slice(begin, end) for begin, end in ranges])
  attribute[index] = data

  #########################################################################
  # Update attribute min/max statistics ...

  is_string = data.dtype.char in ["O", "S", "U"]

  # If the data is numeric, filter-out NaNs so we can ignore them ...
  if not is_string:
    data = data[numpy.invert(numpy.isnan(data))]

  # Calculate the min/max of whatever data remains ...
  if len(data):
    data_min = numpy.amin(data)
    data_max = numpy.amax(data)
  else:
    data_min = None
    data_max = None

  # Merge the min/max into any existing min/max data ...
  attribute_min = attribute.attrs["min"] if "min" in attribute.attrs else None
  attribute_max = attribute.attrs["max"] if "max" in attribute.attrs else None

  if data_min is not None:
    attribute_min = data_min if attribute_min is None else numpy.amin([data_min, attribute_min])
  if data_max is not None:
    attribute_max = data_max if attribute_max is None else numpy.amax([data_max, attribute_max])

  # The type returned by numpy.amin/amax can be tricky ... coerce it into a "normal" Python type.
  if attribute_min is not None:
    if is_string:
      attribute_min = str(attribute_min)
    else:
      attribute_min = numpy.asscalar(attribute_min)
  if attribute_max is not None:
    if is_string:
      attribute_max = str(attribute_max)
    else:
      attribute_max = numpy.asscalar(attribute_max)

  if attribute_min is not None:
    attribute.attrs["min"] = attribute_min
  if attribute_max is not None:
    attribute.attrs["max"] = attribute_max

def get_array_metadata(file, array_index):
  """Return an {attributes, dimensions, statistics} dict describing an array."""
  array_key = "array/{}".format(array_index)
  array_metadata = raw_array_metadata(file, array_index)
  attribute_names = array_metadata["attribute-names"]
  attribute_types = array_metadata["attribute-types"]
  dimension_names = array_metadata["dimension-names"]
  dimension_types = array_metadata["dimension-types"]
  dimension_begin = array_metadata["dimension-begin"]
  dimension_end = array_metadata["dimension-end"]
  statistics = []
  for attribute_index in range(len(attribute_types)):
    attribute_metadata = file["array/{}/attribute/{}".format(array_index, attribute_index)].attrs
    statistics.append({"min":attribute_metadata.get("min", None), "max":attribute_metadata.get("max", None)})

  return {
    "attributes" : [{"name":name, "type":type} for name, type in zip(attribute_names, attribute_types)],
    "dimensions" : [{"name":name, "type":type, "begin":begin, "end":end} for name, type, begin, end in zip(dimension_names, dimension_types, dimension_begin, dimension_end)],
    "statistics" : statistics,
    }

def get_array_shape(file, array_index):
  array_key = "array/{}".format(array_index)
  array_metadata = raw_array_metadata(file, array_index)
  dimension_begin = array_metadata["dimension-begin"]
  dimension_end = array_metadata["dimension-end"]
  return tuple([end - begin for begin, end in zip(dimension_begin, dimension_end)])

def get_array_attribute(file, array_index, attribute_index):
  """Return attribute data from an array."""
  return file["array/{}/attribute/{}".format(array_index, attribute_index)]
