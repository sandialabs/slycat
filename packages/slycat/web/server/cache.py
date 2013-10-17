import slycat.web.server.database.couchdb
import slycat.web.server.database.scidb
import threading

_array_metadata = {}
_array_metadata_lock = threading.Lock()

def get_array_metadata(mid, aid, artifact, artifact_type):
  with _array_metadata_lock:
    if (mid, aid) not in _array_metadata:
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
        database = slycat.web.server.database.scidb.connect()
        with database.query("aql", "select name from %s" % artifact["column-names"]) as results:
          attribute_names = [value.getString() for attribute in results for value in attribute]

        with database.query("aql", "select type_id from attributes(%s)" % artifact["columns"]) as results:
          attribute_types = [value.getString() for attribute in results for value in attribute]

        with database.query("aql", "select name, type, low as begin, high + 1 as end from dimensions(%s)" % artifact["columns"]) as results:
          attribute = iter(results)
          dimension_names = [value.getString() for value in attribute.next()]
          dimension_types = [value.getString() for value in attribute.next()]
          dimension_begin = [value.getInt64() for value in attribute.next()]
          dimension_end = [value.getInt64() for value in attribute.next()]
      else:
        raise Exception("Unsupported artifact type.")

      # SciDB uses "float" and "double", but we prefer "float32" and "float64"
      type_map = {"float":"float32", "double":"float64"}
      attribute_types = [type_map[type] if type in type_map else type for type in attribute_types]
      dimension_types = [type_map[type] if type in type_map else type for type in dimension_types]

      _array_metadata[(mid, aid)] = {
        "attributes" : [{"name" : name, "type" : type} for name, type in zip(attribute_names, attribute_types)],
        "dimensions" : [{"name" : name, "type" : type, "begin" : begin, "end" : end} for name, type, begin, end in zip(dimension_names, dimension_types, dimension_begin, dimension_end)]
        }

    return _array_metadata[(mid, aid)]

