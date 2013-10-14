# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import argparse
import couchdb
import glob
import json
import os
import pprint
import re
import shutil
import StringIO
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument("--couchdb-host", default="localhost", help="CouchDB host.  Default: %(default)s")
parser.add_argument("--couchdb-port", type=int, default=5984, help="CouchDB port.  Default: %(default)s")
parser.add_argument("--couchdb-database", default="slycat", help="CouchDB database.  Default: %(default)s")
parser.add_argument("--marking", default=[], action="append", help="Use --marking='<source>:<target>' to transform <source> markings to <target> markings.  You may specifiy --marking multiple times.")
parser.add_argument("--iquery", default="/opt/scidb/13.3/bin/iquery", help="SciDB iquery executable.  Default: %(default)s")
parser.add_argument("--input-dir", help="Directory containing a project created with slycat-dump-project.py.")
arguments = parser.parse_args()

if arguments.input_dir is None:
  raise Exception("--input-dir is required.")

markings = [marking.split(":") for marking in arguments.marking]
markings = dict([(source, target) for source, target in markings])

couchdb = couchdb.Server()[arguments.couchdb_database]

try:
  iquery = subprocess.Popen([arguments.iquery, "-o", "csv", "-aq", "list('instances')"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
  stdout, stderr = iquery.communicate()
  coordinator_dir = StringIO.StringIO(stdout).readlines()[1].split(",")[-1].strip()[1:-1]
except:
  raise Exception("Couldn't query SciDB for the coordinator directory.")

project_dir = arguments.input_dir
project = json.load(open(os.path.join(project_dir, "project.json")))
del project["_rev"]
couchdb.save(project)

project_arrays = set()

for model_dir in glob.glob(os.path.join(project_dir, "model-*")):
  model = json.load(open(os.path.join(model_dir, "model.json")))
  del model["_rev"]
  if model["marking"] in markings:
    model["marking"] = markings[model["marking"]]
  couchdb.save(model)

  model_arrays = glob.glob(os.path.join(model_dir, "*.schema"))
  model_arrays = [re.search(r"/([^/]*).schema", array).group(1) for array in model_arrays]

  for array in model_arrays:
    if array not in project_arrays:
      couchdb[array] = {"type":"array"}
      project_arrays.add(array)

#  for array_schema in glob.glob(os.path.join(model_dir, "*.schema")):
#    array_schema = open(array_schema).read()
#
#  for array_data in glob.glob(os.path.join(model_dir, "*.opaque")):
#    pass

#  for artifact, value in model.items():
#    if not artifact.startswith("artifact:"):
#      continue
#    if not isinstance(value, dict):
#      continue
#    for array, id in value.items():
#      iquery = subprocess.Popen([arguments.iquery, "-o", "csv", "-aq", "show(%s)" % id], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
#      stdout, stderr = iquery.communicate()
#      schema = StringIO.StringIO(stdout).readlines()[1].strip()[5:-1]
#      open(os.path.join(model_dir, "%s.schema" % id), "w").write(schema)
#
#      subprocess.check_call([arguments.iquery, "-n", "-aq", "save(%s, '%s.opaque', -2, 'OPAQUE')" % (id, id)])
#      subprocess.check_call(["mv", os.path.join(coordinator_dir, "%s.opaque" % id), os.path.join(model_dir, "%s.opaque" % id)])
