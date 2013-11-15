# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import argparse
import couchdb
import glob
import json
import logging
import os
import re
import shutil
import slycat.web.server.database.hdf5

parser = argparse.ArgumentParser()
parser.add_argument("--couchdb-database", default="slycat", help="CouchDB database.  Default: %(default)s")
parser.add_argument("--couchdb-host", default="localhost", help="CouchDB host.  Default: %(default)s")
parser.add_argument("--couchdb-port", type=int, default=5984, help="CouchDB port.  Default: %(default)s")
parser.add_argument("--data-store", default="data-store", help="Path to the hdf5 data storage directory.  Default: %(default)s")
parser.add_argument("--force", action="store_true", help="Overwrite existing data.")
parser.add_argument("--input-dir", required=True, help="Directory containing data dumped with slycat-dump.py.")
parser.add_argument("--marking", default=[], action="append", help="Use --marking='<source>:<target>' to transform <source> markings to <target> markings.  You may specifiy --marking multiple times.")
arguments = parser.parse_args()

logging.getLogger().setLevel(logging.INFO)

# Sanity check input arguments ...
markings = [marking.split(":") for marking in arguments.marking]
markings = dict([(source, target) for source, target in markings])

couchdb = couchdb.Server()[arguments.couchdb_database]

# Load projects ...
for path in glob.glob(os.path.join(arguments.input_dir, "project-*.json")):
  logging.info("Loading project %s", path)
  project = json.load(open(path))
  del project["_rev"]
  if arguments.force and project["_id"] in couchdb:
    del couchdb[project["_id"]]
  couchdb.save(project)

# Load models ...
for path in glob.glob(os.path.join(arguments.input_dir, "model-*.json")):
  logging.info("Loading model %s", path)
  model = json.load(open(path))
  del model["_rev"]
  if model["marking"] in markings:
    model["marking"] = markings[model["marking"]]
  if arguments.force and model["_id"] in couchdb:
    del couchdb[model["_id"]]
  couchdb.save(model)

# Load array sets ...
for path in glob.glob(os.path.join(arguments.input_dir, "array-set-*.hdf5")):
  logging.info("Loading array set %s", path)
  array = re.match(r".*array-set-(.*)\.hdf5", path).group(1)
  shutil.copy(path, slycat.web.server.database.hdf5.make_path(array, arguments.data_store))
