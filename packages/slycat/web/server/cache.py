import cherrypy
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

_table_metadata = {}
_table_metadata_lock = threading.Lock()

def get_table_metadata(mid, aid, artifact, artifact_type):
  with _table_metadata_lock:
    if (mid, aid) not in _table_metadata:
      if artifact_type == "table":
        database = slycat.web.server.database.scidb.connect()
        with database.query("aql", "select name from %s" % artifact["column-names"]) as results:
          column_names = [value.getString() for attribute in results for value in attribute]
          column_count = len(column_names)

        with database.query("aql", "select type_id from attributes(%s)" % artifact["columns"]) as results:
          column_types = [value.getString() for attribute in results for value in attribute]

        row_begin = database.query_value("aql", "select low from dimensions(%s)" % artifact["columns"]).getInt64()
        row_end = database.query_value("aql", "select high + 1 from dimensions(%s)" % artifact["columns"]).getInt64()
        row_count = row_end - row_begin

        with database.query("aql", "select {} from {}".format(",".join(["min(c{})".format(index) for index in range(column_count)]), artifact["columns"])) as results:
          column_min = []
          index = 0
          for attribute in results:
            for value in attribute:
              if column_types[index] == "double":
                column_min.append(value.getDouble())
              elif column_types[index] == "string":
                column_min.append(value.getString())
              index += 1
        with database.query("aql", "select {} from {}".format(",".join(["max(c{})".format(index) for index in range(column_count)]), artifact["columns"])) as results:
          column_max = []
          index = 0
          for attribute in results:
            for value in attribute:
              if column_types[index] == "double":
                column_max.append(value.getDouble())
              elif column_types[index] == "string":
                column_max.append(value.getString())
              index += 1
      else:
        raise Exception("Unsupported artifact type.")

      # SciDB uses "float" and "double", but we prefer "float32" and "float64"
      type_map = {"float":"float32", "double":"float64"}
      column_types = [type_map[type] if type in type_map else type for type in column_types]

      _table_metadata[(mid, aid)] = {
        "row-count" : row_count,
        "column-count" : column_count,
        "column-names" : column_names,
        "column-types" : column_types,
        "column-min" : column_min,
        "column-max" : column_max
        }

    return _table_metadata[(mid, aid)]

