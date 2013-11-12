import copy
import h5py
import numpy
import slycat.web.server.database.hdf5
import threading

def dataset_min(dataset):
  array = numpy.array(dataset)
  if array.dtype.char not in ["O", "S"]:
    array = array[numpy.invert(numpy.isnan(array))]
  if len(array):
    return numpy.asscalar(numpy.min(array))
  return None

def dataset_max(dataset):
  array = numpy.array(dataset)
  if array.dtype.char not in ["O", "S"]:
    array = array[numpy.invert(numpy.isnan(array))]
  if len(array):
    return numpy.asscalar(numpy.max(array))
  return None

def get_array_metadata(mid, aid, artifact):
  """Return cached metadata for an array artifact, retrieving it from the database as-needed."""
  with get_array_metadata.lock:
    if (mid, aid) not in get_array_metadata.cache:
      with slycat.web.server.database.hdf5.open(artifact["storage"]) as file:
        array_metadata = file.array(0).attrs
        attribute_names = array_metadata["attribute-names"]
        attribute_types = array_metadata["attribute-types"]
        dimension_names = array_metadata["dimension-names"]
        dimension_types = array_metadata["dimension-types"]
        dimension_begin = array_metadata["dimension-begin"]
        dimension_end = array_metadata["dimension-end"]

      get_array_metadata.cache[(mid, aid)] = {
        "attributes" : [{"name":name, "type":type} for name, type in zip(attribute_names, attribute_types)],
        "dimensions" : [{"name":name, "type":type, "begin":begin, "end":end} for name, type, begin, end in zip(dimension_names, dimension_types, dimension_begin, dimension_end)]
        }

    metadata = get_array_metadata.cache[(mid, aid)]

    return metadata

get_array_metadata.cache = {}
get_array_metadata.lock = threading.Lock()


def get_table_metadata(mid, aid, artifact, index):
  """Return cached metadata for a table artifact, retrieving it from the database as-needed."""
  with get_table_metadata.lock:
    if (mid, aid) not in get_table_metadata.cache:
      with slycat.web.server.database.hdf5.open(artifact["storage"]) as file:
        array_metadata = file.array(0).attrs
        column_names = array_metadata["attribute-names"]
        column_types = array_metadata["attribute-types"]
        dimension_begin = array_metadata["dimension-begin"]
        dimension_end = array_metadata["dimension-end"]
        column_min = [dataset_min(file.array_attribute(0, i)) for i in range(len(column_names))]
        column_max = [dataset_max(file.array_attribute(0, i)) for i in range(len(column_names))]

      if len(dimension_begin) != 1:
        raise Exception("Not a table (1D array) artifact.")

      get_table_metadata.cache[(mid, aid)] = {
        "row-count" : dimension_end[0] - dimension_begin[0],
        "column-count" : len(column_names),
        "column-names" : column_names.tolist(),
        "column-types" : column_types.tolist(),
        "column-min" : column_min,
        "column-max" : column_max
        }

    metadata = get_table_metadata.cache[(mid, aid)]

    if index is not None:
      metadata = copy.deepcopy(metadata)
      metadata["column-count"] += 1
      metadata["column-names"].append(index)
      metadata["column-types"].append("int64")
      metadata["column-min"].append(0)
      metadata["column-max"].append(metadata["row-count"] - 1)

    return metadata
get_table_metadata.cache = {}
get_table_metadata.lock = threading.Lock()



def get_sorted_table_query(mid, aid, artifact, metadata, sort, index):
  # This is a little heavy handed, but it ensures that we don't have two
  # threads trying to sort the same table at the same time.

  query = "{array}".format(array = artifact["columns"])
  if index is not None:
    query = "apply({array}, c{column}, row)".format(array=query, column=metadata["column-count"] - 1)
  if sort is not None:
    query_sort = ",".join(["c{column} {order}".format(column=column, order="asc" if order == "ascending" else "desc") for column, order in sort])
    query = "sort({array}, {sort})".format(array=query, sort=query_sort)
  return query

get_sorted_table_query.lock = threading.Lock()
