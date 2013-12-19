import h5py
import numpy
import slycat.data.array
import slycat.web.server.database.hdf5

def start_array_set(path):
  with h5py.File(path, "w") as file:
    pass

def start_array(path, array_index, attributes, dimensions):
  attributes = slycat.data.array.require_attributes(attributes)
  dimensions = slycat.data.array.require_dimensions(dimensions)
  stored_types = [slycat.web.server.database.hdf5.dtype(attribute["type"]) for attribute in attributes]
  shape = [dimension["end"] - dimension["begin"] for dimension in dimensions]

  # Allocate space for the coming data ...
  with h5py.File(path, "r+") as file:
    array_key = "array/{}".format(array_index)
    if array_key in file:
      del file[array_key]
    for attribute_index, stored_type in enumerate(stored_types):
      file.create_dataset("array/{}/attribute/{}".format(array_index, attribute_index), shape, dtype=stored_type)

    # Store array metadata ...
    array_metadata = file[array_key].attrs
    array_metadata["attribute-names"] = numpy.array([attribute["name"] for attribute in attributes], dtype=h5py.special_dtype(vlen=unicode))
    array_metadata["attribute-types"] = numpy.array([attribute["type"] for attribute in attributes], dtype=h5py.special_dtype(vlen=unicode))
    array_metadata["dimension-names"] = numpy.array([dimension["name"] for dimension in dimensions], dtype=h5py.special_dtype(vlen=unicode))
    array_metadata["dimension-types"] = numpy.array([dimension["type"] for dimension in dimensions], dtype=h5py.special_dtype(vlen=unicode))
    array_metadata["dimension-begin"] = numpy.array([dimension["begin"] for dimension in dimensions], dtype="int64")
    array_metadata["dimension-end"] = numpy.array([dimension["end"] for dimension in dimensions], dtype="int64")

def store_array_attribute(path, array_index, attribute_index, ranges, data):
  with h5py.File(path, "r+") as file:
    array_key = "array/{}".format(array_index)
    attribute_key = "array/{}/attribute/{}".format(array_index, attribute_index)
    array_metadata = file[array_key].attrs
    if not (0 <= attribute_index and attribute_index < len(array_metadata["attribute-names"])):
      raise Exception("Attribute index {} out-of-range.".format(attribute_index))
    stored_type = slycat.web.server.database.hdf5.dtype(array_metadata["attribute-types"][attribute_index])

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

    # Update attribute min/max statistics ...
    if data.dtype.char not in ["O", "S"]:
      data = data[numpy.invert(numpy.isnan(data))]
    data_min = numpy.asscalar(numpy.min(data)) if len(data) else None
    data_max = numpy.asscalar(numpy.max(data)) if len(data) else None

    attribute_min = attribute.attrs["min"] if "min" in attribute.attrs else None
    attribute_max = attribute.attrs["max"] if "max" in attribute.attrs else None

    if data_min is not None:
      attribute_min = data_min if attribute_min is None else min(data_min, attribute_min)
    if data_max is not None:
      attribute_max = data_max if attribute_max is None else max(data_max, attribute_max)

    if attribute_min is not None:
      attribute.attrs["min"] = attribute_min
    if attribute_max is not None:
      attribute.attrs["max"] = attribute_max

def get_array_metadata(path, array_index):
  with h5py.File(path, "r") as file:
    array_key = "array/{}".format(array_index)
    array_metadata = file[array_key].attrs
    attribute_names = array_metadata["attribute-names"]
    attribute_types = array_metadata["attribute-types"]
    dimension_names = array_metadata["dimension-names"]
    dimension_types = array_metadata["dimension-types"]
    dimension_begin = array_metadata["dimension-begin"]
    dimension_end = array_metadata["dimension-end"]
    statistics = []
    for attribute_index in range(len(attribute_types)):
      array_metadata = file["array/{}/attribute/{}".format(array_index, attribute_index)].attrs
      statistics.append({"min":array_metadata.get("min", None), "max":array_metadata.get("max", None)})

    return ([{"name":name, "type":type} for name, type in zip(attribute_names, attribute_types)],
      [{"name":name, "type":type, "begin":begin, "end":end} for name, type, begin, end in zip(dimension_names, dimension_types, dimension_begin, dimension_end)],
      statistics
      )

def get_array_attribute(path, array_index, attribute_index):
  with h5py.File(path, "r") as file:
    return file["array/{}/attribute/{}".format(array_index, attribute_index)][...]
