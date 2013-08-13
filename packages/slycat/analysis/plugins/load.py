# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

schema_plugin_map = {}

def register_client_plugin(context):
  from slycat.analysis.plugin.client import InvalidArgument

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

      csv-file    Loads data from a single CSV file, partitioned in round-robin
                  order among workers.  Use the "delimiter" parameter to specify the field
                  delimiter, which defaults to ",".  If the "format" parameter is None (the
                  default), every attribute in the output array will be of type "string".
                  Pass a list of types to "format" to specify alternate attribute types in
                  the output array.  Use the "chunk_size" parameter to specify the maximum
                  chunk size of the output array.  Otherwise, the file will be evenly split
                  into N chunks, one on each of N workers.

      prn-file    Loads data from a single PRN file, partitioned in round-robin
                  order among workers.  Use the "chunk_size" parameter to specify the
                  maximum chunk size of the output array.  Otherwise, the file will be
                  evenly split into N chunks, one on each of N workers.
    """
    if schema not in schema_plugin_map:
      raise InvalidArgument("Unknown schema: %s" % schema)
    return connection.call_plugin_function(schema_plugin_map[schema], path, **keywords)
  context.register_plugin_function("load", load)

def finalize_plugins(context):
  global schema_plugin_map
  for name, (function, metadata) in context.functions.items():
    if "load-schema" in metadata:
      schema_plugin_map[metadata["load-schema"]] = name
