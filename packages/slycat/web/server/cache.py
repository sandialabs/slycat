import copy
import cherrypy
import h5py
import numpy
import slycat.web.server.database.hdf5
import threading

def get_array_metadata(mid, aid, array, artifact):
  """Return cached metadata for an array artifact, retrieving it from the database as-needed."""
  with get_array_metadata.lock:
    if (mid, aid, array) not in get_array_metadata.cache:
      with slycat.web.server.database.hdf5.open(artifact["storage"]) as file:
        array_metadata = file.array(array).attrs
        attribute_names = array_metadata["attribute-names"]
        attribute_types = array_metadata["attribute-types"]
        dimension_names = array_metadata["dimension-names"]
        dimension_types = array_metadata["dimension-types"]
        dimension_begin = array_metadata["dimension-begin"]
        dimension_end = array_metadata["dimension-end"]
        attribute_metadata = [file.array_attribute(array, attribute).attrs for attribute in range(len(attribute_types))]
        statistics = [{"min":metadata.get("min", None), "max":metadata.get("max", None)} for metadata in attribute_metadata]

      get_array_metadata.cache[(mid, aid, array)] = {
        "attributes" : [{"name":name, "type":type} for name, type in zip(attribute_names, attribute_types)],
        "dimensions" : [{"name":name, "type":type, "begin":begin, "end":end} for name, type, begin, end in zip(dimension_names, dimension_types, dimension_begin, dimension_end)],
        "statistics" : statistics
        }

    metadata = get_array_metadata.cache[(mid, aid, array)]

    return metadata

get_array_metadata.cache = {}
get_array_metadata.lock = threading.Lock()


def get_table_metadata(mid, aid, array, artifact, index):
  """Return cached metadata for a table artifact, retrieving it from the database as-needed."""
  with get_table_metadata.lock:
    if (mid, aid, array) not in get_table_metadata.cache:
      with slycat.web.server.database.hdf5.open(artifact["storage"]) as file:
        array_metadata = file.array(array).attrs
        column_names = array_metadata["attribute-names"]
        column_types = array_metadata["attribute-types"]
        dimension_begin = array_metadata["dimension-begin"]
        dimension_end = array_metadata["dimension-end"]
        attribute_metadata = [file.array_attribute(array, attribute).attrs for attribute in range(len(column_names))]
        column_min = [metadata.get("min", None) for metadata in attribute_metadata]
        column_max = [metadata.get("max", None) for metadata in attribute_metadata]

      if len(dimension_begin) != 1:
        raise Exception("Not a table (1D array) artifact.")

      get_table_metadata.cache[(mid, aid, array)] = {
        "row-count" : dimension_end[0] - dimension_begin[0],
        "column-count" : len(column_names),
        "column-names" : column_names.tolist(),
        "column-types" : column_types.tolist(),
        "column-min" : column_min,
        "column-max" : column_max
        }

    metadata = get_table_metadata.cache[(mid, aid, array)]

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


