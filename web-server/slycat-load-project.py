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

# Get the set of all arrays already in SciDB ...
iquery = subprocess.Popen([arguments.iquery, "-o", "csv", "-aq", "list('arrays')"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
stdout, stderr = iquery.communicate()
scidb_arrays = StringIO.StringIO(stdout).readlines()[1:]
scidb_arrays = [array.split(",")[0].strip()[1:-1] for array in scidb_arrays]

# Load projects ...
for path in glob.glob(os.path.join(arguments.input_dir, "project-*.json")):
  project = json.load(open(path))
  del project["_rev"]
  if arguments.force and project["_id"] in couchdb:
    del couchdb[project["_id"]]
  couchdb.save(project)

# Load models ...
for path in glob.glob(os.path.join(arguments.input_dir, "model-*.json")):
  model = json.load(open(path))
  del model["_rev"]
  if model["marking"] in markings:
    model["marking"] = markings[model["marking"]]
  if arguments.force and model["_id"] in couchdb:
    del couchdb[model["_id"]]
  couchdb.save(model)

# Create partial arrays ...
for path in glob.glob(os.path.join(arguments.input_dir, "array-*-*.schema")):
  schema = open(path).read()
  partial_array = schema.split("<")[0]
  if arguments.force and partial_array in scidb_arrays:
    subprocess.check_call([arguments.iquery, "-aq", "remove(%s)" % partial_array])
  subprocess.check_call([arguments.iquery, "-aq", "create array %s" % schema])

# Load partial arrays ...
for path in glob.glob(os.path.join(arguments.input_dir, "array-*-*.opaque")):
  match = re.search(r"array-(.*)-(.*).opaque", path)
  array = match.group(1)
  index = match.group(2)
  partial_array = "%s%s" % (array, index)
  subprocess.check_call(["cp", path, os.path.join(coordinator_dir, "temp.opaque")])
  subprocess.check_call([arguments.iquery, "-aq", "load(%s, 'temp.opaque', -2, 'OPAQUE')" % (partial_array)])

# Create full arrays ...
for path in glob.glob(os.path.join(arguments.input_dir, "array-*-0.schema")):
  schema = open(path[:-9] + ".schema").read()
  array = schema.split("<")[0]
  if arguments.force and array in scidb_arrays:
    subprocess.check_call([arguments.iquery, "-aq", "remove(%s)" % array])
  subprocess.check_call([arguments.iquery, "-aq", "create array %s" % schema])

# Combine partial arrays into full arrays ...
for path in glob.glob(os.path.join(arguments.input_dir, "array-*-0.schema")):
  schema = open(path[:-9] + ".schema").read()
  array = schema.split("<")[0]

  partial_arrays = glob.glob(os.path.join(arguments.input_dir, "array-%s-*.schema" % array))
  if len(partial_arrays) == 1:
    subprocess.check_call([arguments.iquery, "-aq", "store(%s0, %s)" % (array, array)])
  elif len(partial_arrays) == 2:
    subprocess.check_call([arguments.iquery, "-aq", "store(join(%s0, %s1), %s)" % (array, array, array)])
  else:
    raise Exception("Not implemented.")

# Delete partial arrays ...
for path in glob.glob(os.path.join(arguments.input_dir, "array-*-*.schema")):
  schema = open(path).read()
  partial_array = schema.split("<")[0]
  subprocess.check_call([arguments.iquery, "-aq", "remove(%s)" % partial_array])

