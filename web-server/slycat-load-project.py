# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import argparse
import couchdb
import glob
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
parser.add_argument("--force", action="store_true", help="Overwrite existing data.")
parser.add_argument("--marking", default=[], action="append", help="Use --marking='<source>:<target>' to transform <source> markings to <target> markings.  You may specifiy --marking multiple times.")
parser.add_argument("--iquery", default="/opt/scidb/13.3/bin/iquery", help="SciDB iquery executable.  Default: %(default)s")
parser.add_argument("--input-dir", help="Directory containing a project created with slycat-dump-project.py.")
arguments = parser.parse_args()

# Sanity check input arguments ...
if arguments.input_dir is None:
  raise Exception("--input-dir is required.")

markings = [marking.split(":") for marking in arguments.marking]
markings = dict([(source, target) for source, target in markings])

couchdb = couchdb.Server()[arguments.couchdb_database]

# Get the directory where we'll put SciDB arrays to be loaded ...
iquery = subprocess.Popen([arguments.iquery, "-o", "csv", "-aq", "list('instances')"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
stdout, stderr = iquery.communicate()
coordinator_dir = StringIO.StringIO(stdout).readlines()[1].split(",")[-1].strip()[1:-1]

# Get the set of all arrays in SciDB ...
iquery = subprocess.Popen([arguments.iquery, "-o", "csv", "-aq", "list('arrays')"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
stdout, stderr = iquery.communicate()
scidb_arrays = StringIO.StringIO(stdout).readlines()[1:]
scidb_arrays = [array.split(",")[0].strip()[1:-1] for array in scidb_arrays]

project_dir = arguments.input_dir
project = json.load(open(os.path.join(project_dir, "project.json")))
del project["_rev"]
if arguments.force and project["_id"] in couchdb:
  del couchdb[project["_id"]]
couchdb.save(project)

project_arrays = set()

for model_dir in glob.glob(os.path.join(project_dir, "model-*")):
  model = json.load(open(os.path.join(model_dir, "model.json")))
  del model["_rev"]
  if model["marking"] in markings:
    model["marking"] = markings[model["marking"]]
  if arguments.force and model["_id"] in couchdb:
    del couchdb[model["_id"]]
  couchdb.save(model)

  model_arrays = glob.glob(os.path.join(model_dir, "*.schema"))
  model_arrays = [re.search(r"/([^/]*).schema", array).group(1) for array in model_arrays]

  for array in model_arrays:
    if array not in project_arrays:
      subprocess.check_call(["cp", os.path.join(model_dir, "%s.opaque" % array), os.path.join(coordinator_dir, "%s.opaque" % array)])

      schema = open(os.path.join(model_dir, "%s.schema" % array)).read()
      if arguments.force and array in scidb_arrays:
        subprocess.check_call([arguments.iquery, "-aq", "remove(%s)" % array])
      subprocess.check_call([arguments.iquery, "-aq", "create array %s" % schema])
      subprocess.check_call([arguments.iquery, "-aq", "load(%s, '%s.opaque', -2, 'OPAQUE')" % (array, array)])

      if arguments.force and array in couchdb:
        del couchdb[array]
      couchdb[array] = {"type":"array"}
      project_arrays.add(array)

