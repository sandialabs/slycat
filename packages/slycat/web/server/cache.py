import cherrypy
import copy
import h5py
import numpy
import slycat.web.server.database.couchdb
import slycat.web.server.database.hdf5
import slycat.web.server.database.scidb
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

def get_array_metadata(mid, aid, artifact, artifact_type):
  """Return cached metadata for an array artifact, retrieving it from the database as-needed."""
  with get_array_metadata.lock:
    if (mid, aid) not in get_array_metadata.cache:
      if artifact_type == "array":
        database = slycat.web.server.database.scidb.connect()
        with database.query("aql", "select name from %s" % artifact["attribute-names"]) as results:
          attribute_names = [value.getString() for attribute in results for value in attribute]

        with database.query("aql", "select type_id from attributes(%s)" % artifact["data"]) as results:
          attribute_types = [value.getString() for attribute in results for value in attribute]

        with database.query("aql", "select name from %s" % artifact["dimension-names"]) as results:
          dimension_names = [value.getString() for attribute in results for value in attribute]

        with database.query("aql", "select type, low as begin, high + 1 as end from dimensions(%s)" % artifact["data"]) as results:
          attribute = iter(results)
          dimension_types = [value.getString() for value in attribute.next()]
          dimension_begin = [value.getInt64() for value in attribute.next()]
          dimension_end = [value.getInt64() for value in attribute.next()]
      elif artifact_type == "table":
        with slycat.web.server.database.hdf5.open(artifact["storage"]) as file:
          attribute_names = file.attrs["attribute-names"].tolist()
          attribute_types = [file.attribute(i).dtype for i in range(len(attribute_names))]
          dimension_names = ["row"]
          dimension_types = ["int64"]
          dimension_begin = [0]
          dimension_end = [file.attrs["shape"][0]]

          # h5py uses special types for unicode strings, convert them to "string"
          type_map = {h5py.special_dtype(vlen=unicode) : "string"}
          attribute_types = [type_map[type] if type in type_map else type.name for type in attribute_types]
      else:
        raise Exception("Unsupported artifact type.")

      # SciDB uses "float" and "double", but we prefer "float32" and "float64"
      type_map = {"float":"float32", "double":"float64"}
      attribute_types = [type_map[type] if type in type_map else type for type in attribute_types]
      dimension_types = [type_map[type] if type in type_map else type for type in dimension_types]

      get_array_metadata.cache[(mid, aid)] = {
        "attributes" : [{"name" : name, "type" : type} for name, type in zip(attribute_names, attribute_types)],
        "dimensions" : [{"name" : name, "type" : type, "begin" : begin, "end" : end} for name, type, begin, end in zip(dimension_names, dimension_types, dimension_begin, dimension_end)]
        }

    return get_array_metadata.cache[(mid, aid)]

get_array_metadata.cache = {}
get_array_metadata.lock = threading.Lock()


def get_table_metadata(mid, aid, artifact, artifact_type, index):
  """Return cached metadata for a table artifact, retrieving it from the database as-needed."""
  with get_table_metadata.lock:
    if (mid, aid) not in get_table_metadata.cache:
      if artifact_type == "table":
        with slycat.web.server.database.hdf5.open(artifact["storage"]) as file:
          row_count = file.attrs["shape"][0]
          column_names = file.attrs["attribute-names"].tolist()
          column_count = len(column_names)
          column_types = [file.attribute(i).dtype for i in range(column_count)]
          column_min = [dataset_min(file.attribute(i)) for i in range(column_count)]
          column_max = [dataset_max(file.attribute(i)) for i in range(column_count)]
      else:
        raise Exception("Unsupported artifact type.")

      # h5py uses special types for unicode strings, convert them to "string"
      type_map = {h5py.special_dtype(vlen=unicode) : "string"}
      column_types = [type_map[type] if type in type_map else type.name for type in column_types]

      get_table_metadata.cache[(mid, aid)] = {
        "row-count" : row_count,
        "column-count" : column_count,
        "column-names" : column_names,
        "column-types" : column_types,
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
