# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import h5py
import numbers
import numpy
import os
import slycat.darray

import cherrypy

class DArray(slycat.darray.Prototype):
  """Slycat darray implementation that stores data in an HDF5 file."""
  def __init__(self, storage):
    self._storage = storage
    self._metadata = self._storage.get("metadata", None)
    if self._metadata is None:
      self._metadata = self._storage.attrs
    self._attributes = None

  @property
  def ndim(self):
    """Return the number of dimensions in the darray.

    Returns
    -------
    ndim: integer
      The number of dimensions in the darray.
    """
    return len(self._metadata["dimension-names"])

  @property
  def shape(self):
    """Return the darray shape (its size along each dimension).

    Returns
    -------
    shape: tuple of integers
      The size of the darray along each dimension.
    """
    return tuple([end - begin for begin, end in zip(self._metadata["dimension-begin"], self._metadata["dimension-end"])])

  @property
  def size(self):
    """Return the darray size (total number of elements stored in the darray).

    Returns
    -------
    size: integer
      The total number of elements stored in the darray.
    """
    return numpy.prod(self.shape)

  @property
  def dimensions(self):
    """Return metadata describing the darray dimensions.

    Returns
    -------
    dimensions: list of dicts
    """
    return [dict(name=name, type=type, begin=begin, end=end) for name, type, begin, end in zip(self._metadata["dimension-names"], self._metadata["dimension-types"], self._metadata["dimension-begin"], self._metadata["dimension-end"])]

  @property
  def attributes(self):
    """Return metadata describing the darray attributes.

    Returns
    -------
    attributes: list of dicts
    """
    if self._attributes is None:
      self._attributes = [dict(name=name, type=type) for name, type in zip(self._metadata["attribute-names"], self._metadata["attribute-types"])]
    return self._attributes

  def _update_cache(self, attribute_index):
    attribute_key = "attribute/%s" % attribute_index
    unique_key = "unique/%s" % attribute_index

    attribute = self._storage[attribute_key]
    if "min" in attribute.attrs and "max" in attribute.attrs and "unique" in attribute.attrs and unique_key in self._storage:
      return

    attribute_min = None
    attribute_max = None
    attribute_unique = None

    chunk_size = 1000
    for begin in numpy.arange(0, len(attribute), chunk_size):
      slice = attribute[begin : begin + chunk_size]
      if attribute.dtype.char in ["O", "S", "U"]:
        data_min = min(slice)
        data_max = max(slice)
        data_unique = numpy.unique(slice)
        attribute_min = str(data_min) if attribute_min is None else str(min(data_min, attribute_min))
        attribute_max = str(data_max) if attribute_max is None else str(max(data_max, attribute_max))
        attribute_unique = data_unique if attribute_unique is None else numpy.unique(numpy.concatenate((data_unique, attribute_unique)))
      else:
        slice = slice[numpy.invert(numpy.isnan(slice))]
        if len(slice):
          data_min = numpy.asscalar(slice.min())
          data_max = numpy.asscalar(slice.max())
          data_unique = numpy.unique(slice)
          attribute_min = data_min if attribute_min is None else min(data_min, attribute_min)
          attribute_max = data_max if attribute_max is None else max(data_max, attribute_max)
          attribute_unique = data_unique if attribute_unique is None else numpy.unique(numpy.concatenate((data_unique, attribute_unique)))

    if attribute_min is not None:
      attribute.attrs["min"] = attribute_min
    if attribute_max is not None:
      attribute.attrs["max"] = attribute_max
    if attribute_unique is not None:
      attribute.attrs["unique"] = len(attribute_unique)
      self._storage.create_dataset(unique_key, data=attribute_unique, dtype=dtype(self._metadata["attribute-types"][attribute_index]))

  def get_statistics(self, attribute):
    self._update_cache(attribute)

    attribute = self._storage["attribute/%s" % attribute]
    return {
      "min": attribute.attrs.get("min", None),
      "max": attribute.attrs.get("max", None),
      "unique": attribute.attrs.get("unique", None),
      }

  def get_unique(self, attribute, hyperslice):
    self._update_cache(attribute)

    return {
      "values": self._storage["unique/%s" % attribute][hyperslice]
      }

  def get_data(self, attribute):
    """Return a reference to the data storage for a darray attribute.

    Parameters
    ----------
    attribute: integer, optional
      The integer index of the attribute data to retrieve.

    Returns
    -------
    data: reference to a numpy-array-like object.
      An object implementing a subset of the :class:`numpy.ndarray` interface
      that contains the attribute data.  Note that the returned object only
      `references` the underlying data - data is not retrieved from the file
      until you access it using the `[]` operator.
    """
    class StorageWrapper(object):
      """Ensures that the dtype of data retrieved from the file matches what was put in."""
      def __init__(self, storage, dtype):
        self._storage = storage
        self._dtype = dtype
        if type(self._dtype) is bytes:
            self._dtype = str(self._dtype.decode())
        if self._dtype == "string":
          self._dtype = 'unicode'

      def __getitem__(self, *args, **kwargs):
        result = self._storage.__getitem__(*args, **kwargs)

        # check for unicode string, convert to numpy
        if type(result) is bytes:
          result = numpy.str_(result.decode())

        # check for normal string, convert to numpy
        if type(result) is str:
          result = numpy.str_(result)

        for i in range(0, len(result)):
          try:
            result[i] = result[i].decode('utf-8')
          except (UnicodeDecodeError, AttributeError):
            pass
            
        return result.astype(self._dtype)

    return StorageWrapper(self._storage["attribute/%s" % attribute], self._metadata["attribute-types"][attribute])

  def set_data(self, attribute, hyperslice, data):
    """Overwrite the contents of a darray attribute.

    Parameters
    ----------
    attribute : integer
      The zero-based integer index of the attribute to be overwritten.
    hyperslice : integer, :class:`slice`, :class:`Ellipsis`, or tuple containing one or more integer, :class:`slice`, and :class:`Ellipsis` instances.
      Defines the attribute region to be overwritten.
    data : numpy.ndarray
      Data to be written to the attribute.
    """

    if not (0 <= attribute and attribute < len(self.attributes)):
      cherrypy.log.error("hdf5.py set_data", "Attribute index %s out-of-range." % attribute)
      raise ValueError("Attribute index %s out-of-range." % attribute)
    if isinstance(hyperslice, (numbers.Integral, slice, type(Ellipsis))):
      pass
    elif isinstance(hyperslice, tuple):
      for i in hyperslice:
        if not isinstance(i, (numbers.Integral, slice, type(Ellipsis))):
          cherrypy.log.error("hdf5.py set_data", "Unsupported hyperslice type.")
          raise ValueError("Unsupported hyperslice type.")
    else:
      cherrypy.log.error("hdf5.py set_data", "Unsupported hyperslice type.")
      raise ValueError("Unsupported hyperslice type.")

    # Store the data.
    attribute_storage = self._storage["attribute/%s" % attribute]
    attribute_storage[hyperslice] = data

    # Flush cached sort indices.
    index_key = "index/%s" % attribute
    if index_key in self._storage:
      del self._storage[index_key]

    # Flush cached unique values.
    unique_key = "unique/%s" % attribute
    if unique_key in self._storage:
      del self._storage[unique_key]

    # Flush cached statistics.
    if "min" in attribute_storage.attrs:
      del attribute_storage.attrs["min"]
    if "max" in attribute_storage.attrs:
      del attribute_storage.attrs["max"]
    if "unique" in attribute_storage.attrs:
      del attribute_storage.attrs["unique"]

class ArraySet(object):
  """Wraps an instance of :class:`h5py.File` to implement a Slycat arrayset."""
  def __init__(self, file):
    self._storage = file

  def __len__(self):
    return len(self._storage["array"])

  def __getitem__(self, key):
    return DArray(self._storage["array/%s" % key])

  def keys(self):
    return [int(key) for key in list(self._storage["array"].keys())]

  def array_count(self):
    """Note: this assumes that array indices are contiguous, which we don't explicitly enforce."""
    return len(list(self._storage["array"].keys()))

  def start_array(self, array_index, dimensions, attributes):
    """Add an uninitialized darray to the arrayset.

    An existing array with the same index will be overwritten.

    Parameters
    ----------
    array_index : integer, required.
      Zero-based index of the array to create.
    dimensions : list of dicts, required.
      Description of the new array dimensions.
    attributes : list of dicts, required.
      Description of the new array attributes.

    Returns
    -------
    array : :class:`slycat.hdf5.DArray`
    """
    # cherrypy.log.error("building start_array for put_model_array")
    stub = slycat.darray.Stub(dimensions, attributes)
    shape = [dimension["end"] - dimension["begin"] for dimension in stub.dimensions]
    stored_types = [dtype(attribute["type"]) for attribute in stub.attributes]

    # cherrypy.log.error("allocating space for start_array for put_model_array")
    try:
      # Allocate space for the coming data ...
      array_key = "array/%s" % array_index
      if array_key in self._storage:
        del self._storage[array_key]
      for attribute_index, stored_type in enumerate(stored_types):
        self._storage.create_dataset("array/%s/attribute/%s" % (array_index, attribute_index), shape, dtype=stored_type)
    except Exception as e:
      pass

    # cherrypy.log.error("storing metadata for start_array for put_model_array")
    # Store array metadata ...
    array_metadata = self._storage[array_key].create_group("metadata")
    array_metadata["attribute-names"] = numpy.array([attribute["name"] for attribute in stub.attributes], dtype=h5py.special_dtype(vlen=str))
    array_metadata["attribute-types"] = numpy.array([attribute["type"] for attribute in stub.attributes], dtype=h5py.special_dtype(vlen=str))
    array_metadata["dimension-names"] = numpy.array([dimension["name"] for dimension in stub.dimensions], dtype=h5py.special_dtype(vlen=str))
    array_metadata["dimension-types"] = numpy.array([dimension["type"] for dimension in stub.dimensions], dtype=h5py.special_dtype(vlen=str))
    array_metadata["dimension-begin"] = numpy.array([dimension["begin"] for dimension in stub.dimensions], dtype="int64")
    array_metadata["dimension-end"] = numpy.array([dimension["end"] for dimension in stub.dimensions], dtype="int64")

    # cherrypy.log.error("returning Darray for start_array for put_model_array")
    return DArray(self._storage[array_key])

  def store_array(self, array_index, array):
    """Store a :class:`slycat.darray.Prototype` in the arrayset.

    An existing array with the same index will be overwritten.

    Parameters
    ----------
    array_index : integer, required.
      The index of the array to be created / overwritten.
    array : :class:`slycat.darray.Prototype`, required.
      Existing darray to be stored.

    Returns
    -------
    array : :class:`slycat.hdf5.DArray`
    """
    if not isinstance(array, slycat.darray.Prototype):
      cherrypy.log.error("hdf5.py store_array", "A slycat.darray is required.")
      raise ValueError("A slycat.darray is required.")

    index = tuple([slice(dimension["begin"], dimension["end"]) for dimension in array.dimensions])

    self.start_array(array_index, array.dimensions, array.attributes)
    for attribute_index, attribute in enumerate(array.attributes):
      stored_type = dtype(attribute["type"])
      data = array.get_data(attribute_index)

      # Store the data ...
      attribute_key = "array/%s/attribute/%s" % (array_index, attribute_index)
      hdf5_attribute = self._storage[attribute_key]
      hdf5_attribute[index] = data

    return DArray(self._storage["array/%s" % array_index])

def start_arrayset(file):
  """Create a new array set using an open hdf5 file.

  Parameters
  ----------
  file : :class:`h5py.File`, required.
    An hdf5 file open for writing.

  Returns
  -------
  arrayset : :class:`slycat.hdf5.ArraySet`
  """
  if not isinstance(file, h5py.File):
    cherrypy.log.error("hdf5.py start_arrayset", "An open h5py.File is required.")
    raise ValueError("An open h5py.File is required.")
  file.create_group("array")
  return ArraySet(file)

################################################################################################################################################
# Legacy functionality - don't use these in new code.

def dtype(input_type):
  """Convert a string attribute type into a dtype suitable for use with h5py."""
  try:
    input_type = input_type.decode()
  except (UnicodeDecodeError, AttributeError):
    pass
  if input_type not in list(dtype.type_map.keys()):
    cherrypy.log.error("hdf5.py dtype", "Unsupported type: {}".format(input_type))
    raise Exception("Unsupported type: {}".format(input_type))
  return dtype.type_map[input_type]
dtype.type_map = {"int8":"int8", "int16":"int16", "int32":"int32", "int64":"int64", "uint8":"uint8", "uint16":"uint16", "uint32":"uint32", "uint64":"uint64", "float32":"float32", "float64":"float64", "string":h5py.special_dtype(vlen=str), "float":"float32", "double":"float64"}

def path(array, directory):
  return os.path.join(directory, array[0:2], array[2:4], array[4:6], array + ".hdf5")

