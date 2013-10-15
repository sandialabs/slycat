# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import argparse
import couchdb
import json
import os
import re
import shutil
import StringIO
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument("--couchdb-host", default="localhost", help="CouchDB host.  Default: %(default)s")
parser.add_argument("--couchdb-port", type=int, default=5984, help="CouchDB port.  Default: %(default)s")
parser.add_argument("--couchdb-database", default="slycat", help="CouchDB database.  Default: %(default)s")
parser.add_argument("--iquery", default="/opt/scidb/13.3/bin/iquery", help="SciDB iquery executable.  Default: %(default)s")
parser.add_argument("--force", action="store_true", help="Overwrite existing data.")
parser.add_argument("--project-id", default=[], action="append", help="Project ID to dump.  You may specify --project-id multiple times.")
parser.add_argument("--output-dir", help="Directory for storing results.")
arguments = parser.parse_args()

if arguments.output_dir is None:
  raise Exception("--output-dir is required.")

if arguments.force and os.path.exists(arguments.output_dir):
  shutil.rmtree(arguments.output_dir)
if os.path.exists(arguments.output_dir):
  raise Exception("Output directory already exists.")

couchdb = couchdb.Server()[arguments.couchdb_database]

iquery = subprocess.Popen([arguments.iquery, "-o", "csv", "-aq", "list('instances')"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
stdout, stderr = iquery.communicate()
coordinator_dir = StringIO.StringIO(stdout).readlines()[1].split(",")[-1].strip()[1:-1]

os.makedirs(arguments.output_dir)

for project_id in arguments.project_id:
  project = couchdb[project_id]
  json.dump(project, open(os.path.join(arguments.output_dir, "project-%s.json" % project["_id"]), "w"))

  project_arrays = set()

  for row in couchdb.view("slycat/project-models", startkey=project_id, endkey=project_id):
    model = couchdb[row["id"]]
    json.dump(model, open(os.path.join(arguments.output_dir, "model-%s.json" % model["_id"]), "w"))

    for key, value in model.items():
      if not key.startswith("artifact:"):
        continue
      if not isinstance(value, dict):
        continue
      for role, array in value.items():
        if array in project_arrays:
          continue
        project_arrays.add(array)

        iquery = subprocess.Popen([arguments.iquery, "-o", "csv", "-aq", "show(%s)" % array], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = iquery.communicate()
        schema = StringIO.StringIO(stdout).readlines()[1].strip()[1:-1]
        attributes = re.search(r"<(.*)>", schema).group(1).split(",")
        dimensions = re.search(r"\[.*\]", schema).group(0)

        open(os.path.join(arguments.output_dir, "array-%s.schema" % array), "w").write(schema)

        for index, offset in enumerate(range(0, len(attributes), 250)):
          subattributes = attributes[offset : offset + 250]
          subschema = "%s%s<%s>%s" % (array, index, ",".join(subattributes), dimensions)

          open(os.path.join(arguments.output_dir, "array-%s-%s.schema" % (array, index)), "w").write(subschema)

          subprocess.check_call([arguments.iquery, "-n", "-aq", "save(project(%s, %s), 'temp.opaque', -2, 'OPAQUE')" % (array, ",".join([attribute.split(":")[0] for attribute in subattributes]))])
          subprocess.check_call(["mv", os.path.join(coordinator_dir, "temp.opaque"), os.path.join(arguments.output_dir, "array-%s-%s.opaque" % (array, index))])
