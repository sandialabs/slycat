# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

from slycat.analysis.plugin.client import InvalidArgument
import StringIO

schema_plugin_map = {}

def load(connection, path, schema="csv-file", **keywords):
  """Load an array from the filesystem.

  Signature: load(path, schema="csv-file", **keywords)

  Use the required parameter "path" to specify the location(s) of the data to be
  loaded.  Note that the data is loaded remotely by the connected Slycat Analysis
  workers, from the workers' filesystems, not the client's, and that you will have
  to ensure that the same path refers to the same data across every worker.

  By default, the data to be loaded is assumed to be contained in a single CSV
  (delimited-text) file.  You may override this with the optional schema
  parameter, which specifies the data's organization on disk.  Note that a
  particular schema will capture both the data file format (CSV, PRN, etc), and
  its layout on disk (one file, multiple partitioned files, etc).

  When working with a single-file schema, you generally pass the path to the
  file to be loaded to "path" as a string.  When working with multi-file
  schemas, you might pass a list of string filenames to "path", a single
  top-level directory path string, or something else.

  The set of schemas supported by load() will vary according to which loader
  plugins are installed in your system.  Depending on the schema, you may need
  to provide additional schema-specific keyword parameters when calling load().

  See the per-schema documention below for details:\n\n"""

  if schema not in schema_plugin_map:
    raise InvalidArgument("Unknown schema: %s" % schema)
  return connection.call_plugin_function(schema_plugin_map[schema], path, **keywords)

def register_client_plugin(context):
  context.register_plugin_function("load", load)

def finalize_plugins(context):
  # Collect the set of available file loaders, sorted by their schema ...
  loaders = sorted([(metadata["load-schema"], name, metadata.get("load-schema-doc", "")) for name, (function, metadata) in context.functions.items() if "load-schema" in metadata])

  # For each file loader ...
  global schema_plugin_map
  for schema, plugin, doc in loaders:
    # Make the loader visible to the load() function.
    schema_plugin_map[schema] = plugin

    # Add the loader's documentation to the docstring for the load() function.
    load.__doc__ += "  Schema: {}\n\n".format(schema)
    for line in StringIO.StringIO(doc).readlines():
      load.__doc__ += "    {}\n".format(line.strip())
    load.__doc__ += "\n"
