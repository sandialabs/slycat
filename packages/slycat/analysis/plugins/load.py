# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

from slycat.analysis.plugin.client import InvalidArgument

schema_plugin_map = {}

def load(connection, path, schema="csv-file", **keywords):
  """Load an array from a filesystem.

  Signature: load(path, schema="csv-file", **keywords)

  Use the required parameter path to specify the location of the data to be
  loaded.  Note that the data is loaded remotely by the connected Slycat Analysis
  workers, from the workers' filesystems, not the client's, and that you will have
  to ensure that the same path refers to the same data across every worker.

  By default, the data to be loaded is assumed to be contained in a single
  CSV (delimited-text) file.  You may override this with the optional schema
  parameter, which specifies the data's organization on disk.  Note that a
  particular schema will capture both the data file format (CSV, PRN, etc),
  and its layout on disk (one file, multiple partitioned files, etc).
  Depending on the schema, you may need to provide additional schema-specific
  keyword parameters when calling load().  The currently-supported schemas
  are:

  """

  if schema not in schema_plugin_map:
    raise InvalidArgument("Unknown schema: %s" % schema)
  return connection.call_plugin_function(schema_plugin_map[schema], path, **keywords)

def register_client_plugin(context):
  context.register_plugin_function("load", load)

def finalize_plugins(context):
  global schema_plugin_map
  for name, (function, metadata) in context.functions.items():
    if "load-schema" in metadata:
      schema_plugin_map[metadata["load-schema"]] = name

      if "load-schema-doc" in metadata:
        load.__doc__ += "{}:\n\n{}\n\n".format(metadata["load-schema"], metadata["load-schema-doc"])
