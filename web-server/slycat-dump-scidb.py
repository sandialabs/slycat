# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import argparse
import couchdb
import h5py
import json
import logging
import os
import re
import shutil
import slycat.array
import slycat.web.server.database.hdf5
import slycat.web.server.database.scidb

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
logging.getLogger("cherrypy.error").setLevel(logging.ERROR)

if arguments.force and os.path.exists(arguments.output_dir):
  shutil.rmtree(arguments.output_dir)
if os.path.exists(arguments.output_dir):
  raise Exception("Output directory already exists.")

couchdb = couchdb.Server()[arguments.couchdb_database]
scidb = slycat.web.server.database.scidb.connect()

os.makedirs(arguments.output_dir)

def dump_hdf5(attributes, dimensions, array):
  attributes = [(name, slycat.array.attribute_type_map[type]) for name, type in attributes]
  dimensions = [(name, slycat.array.require_dimension_type(type), begin, end) for name, type, begin, end in dimensions]
  logging.debug("attributes: %s", attributes)
  logging.debug("dimensions: %s", dimensions)

  shape = tuple([end - begin for name, type, begin, end in dimensions])


if arguments.all:
  arguments.project_id = set(arguments.project_id + [row["id"] for row in couchdb.view("slycat/projects")])

for project_id in arguments.project_id:
  logging.info("Dumping project %s", project_id)
  project = couchdb[project_id]
  json.dump(project, open(os.path.join(arguments.output_dir, "project-%s.json" % project["_id"]), "w"))

  project_arrays = set()

  for row in couchdb.view("slycat/project-models", startkey=project_id, endkey=project_id):
    logging.info("Dumping model %s", row["id"])
    model = couchdb[row["id"]]
    json.dump(model, open(os.path.join(arguments.output_dir, "model-%s.json" % model["_id"]), "w"))

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
          dump_hdf5(attributes, dimensions, artifact["data"])

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
          dump_hdf5(attributes, dimensions, artifact["columns"])

      if type == "timeseries":
        logging.info("Dumping timeseries %s", artifact)
        raise NotImplementedError()

#        iquery = subprocess.Popen([arguments.iquery, "-o", "csv", "-aq", "show(%s)" % array], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
#        stdout, stderr = iquery.communicate()
#        schema = StringIO.StringIO(stdout).readlines()[1].strip()[1:-1]
#        attributes = re.search(r"<(.*)>", schema).group(1).split(",")
#        dimensions = re.search(r"\[.*\]", schema).group(0)
#
#        open(os.path.join(arguments.output_dir, "array-%s.schema" % array), "w").write(schema)
#
#        for index, offset in enumerate(range(0, len(attributes), 250)):
#          subattributes = attributes[offset : offset + 250]
#          subschema = "%s%s<%s>%s" % (array, index, ",".join(subattributes), dimensions)
#
#          open(os.path.join(arguments.output_dir, "array-%s-%s.schema" % (array, index)), "w").write(subschema)
#
#          subprocess.check_call([arguments.iquery, "-n", "-aq", "save(project(%s, %s), 'temp.opaque', -2, 'OPAQUE')" % (array, ",".join([attribute.split(":")[0] for attribute in subattributes]))])
#          subprocess.check_call(["mv", os.path.join(coordinator_dir, "temp.opaque"), os.path.join(arguments.output_dir, "array-%s-%s.opaque" % (array, index))])
