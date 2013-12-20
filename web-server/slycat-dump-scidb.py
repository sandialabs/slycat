# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import argparse
import couchdb
import h5py
import json
import logging
import numpy
import os
import re
import shutil
import slycat.data.array
import slycat.data.hdf5
import slycat.web.server.database.hdf5
import slycat.web.server.database.scidb
import sys

parser = argparse.ArgumentParser()
parser.add_argument("--all", action="store_true", help="Dump all projects.")
parser.add_argument("--couchdb-database", default="slycat", help="CouchDB database.  Default: %(default)s")
parser.add_argument("--couchdb-host", default="localhost", help="CouchDB host.  Default: %(default)s")
parser.add_argument("--couchdb-port", type=int, default=5984, help="CouchDB port.  Default: %(default)s")
parser.add_argument("--force", action="store_true", help="Overwrite existing data.")
parser.add_argument("--iquery", default="/opt/scidb/13.3/bin/iquery", help="SciDB iquery executable.  Default: %(default)s")
parser.add_argument("--output-dir", required=True, help="Directory for storing results.")
parser.add_argument("--project-id", default=[], action="append", help="Project ID to dump.  You may specify --project-id multiple times.")
arguments = parser.parse_args()

logging.getLogger().setLevel(logging.INFO)
logging.getLogger().addHandler(logging.StreamHandler())
logging.getLogger().handlers[0].setFormatter(logging.Formatter("{} - %(levelname)s - %(message)s".format(sys.argv[0])))
logging.getLogger("cherrypy.error").setLevel(logging.ERROR)

if arguments.force and os.path.exists(arguments.output_dir):
  shutil.rmtree(arguments.output_dir)
if os.path.exists(arguments.output_dir):
  raise Exception("Output directory already exists.")

couchdb = couchdb.Server()[arguments.couchdb_database]
scidb = slycat.web.server.database.scidb.connect()

os.makedirs(arguments.output_dir)

def dump_hdf5(attributes, dimensions, array, attribute_prefix):
  attributes = [(name, slycat.data.array.attribute_type_map[type]) for name, type in attributes]
  dimensions = [(name, slycat.data.array.require_dimension_type(type), begin, end) for name, type, begin, end in dimensions]
  logging.debug("attributes: %s", attributes)
  logging.debug("dimensions: %s", dimensions)
  with h5py.File(os.path.join(arguments.output_dir, "array-set-%s.hdf5" % array), "w") as file:
    stored_types = [slycat.data.hdf5.dtype(type) for name, type in attributes]
    shape = tuple([end - begin for name, type, begin, end in dimensions])
    for attribute_index, stored_type in enumerate(stored_types):
      file.create_dataset("array/0/attribute/{}".format(attribute_index), shape, dtype=stored_type)
    array_metadata = file["array/0"].attrs
    array_metadata["attribute-names"] = numpy.array([name for name, type in attributes], dtype=h5py.special_dtype(vlen=unicode))
    array_metadata["attribute-types"] = numpy.array([type for name, type in attributes], dtype=h5py.special_dtype(vlen=unicode))
    array_metadata["dimension-names"] = numpy.array([name for name, type, begin, end in dimensions], dtype=h5py.special_dtype(vlen=unicode))
    array_metadata["dimension-types"] = numpy.array([type for name, type, begin, end in dimensions], dtype=h5py.special_dtype(vlen=unicode))
    array_metadata["dimension-begin"] = numpy.array([begin for name, type, begin, end in dimensions], dtype="int64")
    array_metadata["dimension-end"] = numpy.array([end for name, type, begin, end in dimensions], dtype="int64")

    for attribute_index, (name, type) in enumerate(attributes):
      min_value = slycat.web.server.database.scidb.typed_value(type, scidb.query_value("aql", "select min(%s%s) from %s" % (attribute_prefix, attribute_index, array)))
      max_value = slycat.web.server.database.scidb.typed_value(type, scidb.query_value("aql", "select max(%s%s) from %s" % (attribute_prefix, attribute_index, array)))
      storage = file["array/0/attribute/{}".format(attribute_index)]
      storage.attrs["min"] = min_value
      storage.attrs["max"] = max_value
      logging.info("Attribute %s min %s max %s", name, min_value, max_value)

    with scidb.query("aql", "select * from %s" % array) as results:
      for chunk in results.chunks():
        for attribute_index, attribute in enumerate(chunk.attributes()):
          logging.info("Dumping attribute %s of %s" % (attribute_index, len(attributes)))
          type = attribute.type()
          storage = file["array/0/attribute/{}".format(attribute_index)]
          #print numpy.array(list(slycat.web.server.database.scidb.typed_values(attribute.type(), attribute)))
          for coordinates, value in attribute.coordinates_values():
            coordinates = tuple([coordinates[i] for i in range(len(coordinates))])
            storage[coordinates] = slycat.web.server.database.scidb.typed_value(type, value)

if arguments.all:
  arguments.project_id = set(arguments.project_id + [row["id"] for row in couchdb.view("slycat/projects")])

for project_id in arguments.project_id:
  logging.info("Dumping project %s", project_id)
  project = couchdb.get(project_id, attachments=True)
  json.dump(project, open(os.path.join(arguments.output_dir, "project-%s.json" % project["_id"]), "w"))

  project_arrays = set()

  for row in couchdb.view("slycat/project-models", startkey=project_id, endkey=project_id):
    logging.info("Dumping model %s", row["id"])
    model = couchdb.get(row["id"], attachments=True)
    if model["model-type"] == "timeseries":
      continue

    artifact_types = model["artifact-types"]
    for key, artifact in model.items():
      if not key.startswith("artifact:"):
        continue
      type = artifact_types[key[9:]]
      if type == "array":
        if artifact["data"] not in project_arrays:
          logging.info("Dumping array %s", artifact["data"])
          project_arrays.add(artifact["data"])
          with scidb.query("aql", "select name from %s" % artifact["attribute-names"]) as results:
            attribute_names = [value.getString() for attribute in results for value in attribute]
          with scidb.query("aql", "select type_id from attributes(%s)" % artifact["data"]) as results:
            attribute_types = [value.getString() for attribute in results for value in attribute]
          with scidb.query("aql", "select name from %s" % artifact["dimension-names"]) as results:
            dimension_names = [value.getString() for attribute in results for value in attribute]
          with scidb.query("aql", "select type, low as begin, high + 1 as end from dimensions(%s)" % artifact["data"]) as results:
            attribute = iter(results)
            dimension_types = [value.getString() for value in attribute.next()]
            dimension_begin = [value.getInt64() for value in attribute.next()]
            dimension_end = [value.getInt64() for value in attribute.next()]
          attributes = zip(attribute_names, attribute_types)
          dimensions = zip(dimension_names, dimension_types, dimension_begin, dimension_end)
          dump_hdf5(attributes, dimensions, artifact["data"], "a")
        model["artifact-types"][key[9:]] = "hdf5"
        model[key] = artifact["data"]

      if type == "table":
        if artifact["columns"] not in project_arrays:
          logging.info("Dumping table %s", artifact["columns"])
          project_arrays.add(artifact["columns"])
          with scidb.query("aql", "select name from %s" % artifact["column-names"]) as results:
            column_names = [value.getString() for chunk in results.chunks() for attribute in chunk.attributes() for value in attribute.values()]
          with scidb.query("aql", "select type_id from attributes(%s)" % artifact["columns"]) as results:
            column_types = [value.getString() for chunk in results.chunks() for attribute in chunk.attributes() for value in attribute.values()]
          row_begin = scidb.query_value("aql", "select low from dimensions(%s)" % artifact["columns"]).getInt64()
          row_end = scidb.query_value("aql", "select high + 1 from dimensions(%s)" % artifact["columns"]).getInt64()
          attributes = zip(column_names, column_types)
          dimensions = [("row", "int64", row_begin, row_end)]
          dump_hdf5(attributes, dimensions, artifact["columns"], "c")
        model["artifact-types"][key[9:]] = "hdf5"
        model[key] = artifact["columns"]

      if type == "timeseries":
        logging.info("Dumping timeseries %s", artifact)
        raise NotImplementedError()

    json.dump(model, open(os.path.join(arguments.output_dir, "model-%s.json" % model["_id"]), "w"))
