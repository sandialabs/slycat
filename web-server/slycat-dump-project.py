# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import argparse
import couchdb
import json
import os
import shutil
import StringIO
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument("--couchdb-host", default="localhost", help="CouchDB host.  Default: %(default)s")
parser.add_argument("--couchdb-port", type=int, default=5984, help="CouchDB port.  Default: %(default)s")
parser.add_argument("--couchdb-database", default="slycat", help="CouchDB database.  Default: %(default)s")
parser.add_argument("--iquery", default="/opt/scidb/13.3/bin/iquery", help="SciDB iquery executable.  Default: %(default)s")
parser.add_argument("--force", action="store_true", help="Overwrite existing data.")
parser.add_argument("--project-id", help="Project ID to dump.")
parser.add_argument("--output-dir", help="Directory for storing results.")
arguments = parser.parse_args()

if arguments.project_id is None:
  raise Exception("--project-id is required.")
if arguments.output_dir is None:
  raise Exception("--output-dir is required.")

if arguments.force and os.path.exists(arguments.output_dir):
  shutil.rmtree(arguments.output_dir)
if os.path.exists(arguments.output_dir):
  raise Exception("Output directory already exists.")

couchdb = couchdb.Server()[arguments.couchdb_database]

try:
  iquery = subprocess.Popen([arguments.iquery, "-o", "csv", "-aq", "list('instances')"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
  stdout, stderr = iquery.communicate()
  coordinator_dir = StringIO.StringIO(stdout).readlines()[1].split(",")[-1].strip()[1:-1]
except:
  raise Exception("Couldn't query SciDB for the coordinator directory.")

os.makedirs(arguments.output_dir)

project = couchdb[arguments.project_id]
project_dir = arguments.output_dir
json.dump(project, open(os.path.join(project_dir, "project.json"), "w"))

for row in couchdb.view("slycat/project-models", startkey=arguments.project_id, endkey=arguments.project_id):
  model = couchdb[row["id"]]
  model_dir = os.path.join(project_dir, "model-%s" % model["_id"])
  os.mkdir(model_dir)
  json.dump(model, open(os.path.join(model_dir, "model.json"), "w"))

  for artifact, value in model.items():
    if not artifact.startswith("artifact:"):
      continue
    if not isinstance(value, dict):
      continue
    for array, id in value.items():
      iquery = subprocess.Popen([arguments.iquery, "-o", "csv", "-aq", "show(%s)" % id], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
      stdout, stderr = iquery.communicate()
      schema = StringIO.StringIO(stdout).readlines()[1].strip()[5:-1]
      open(os.path.join(model_dir, "%s.schema" % id), "w").write(schema)

      subprocess.check_call([arguments.iquery, "-n", "-aq", "save(%s, '%s.opaque', -2, 'OPAQUE')" % (id, id)])
      subprocess.check_call(["mv", os.path.join(coordinator_dir, "%s.opaque" % id), os.path.join(model_dir, "%s.opaque" % id)])
