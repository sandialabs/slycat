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
import slycat.hdf5
import sys

parser = argparse.ArgumentParser()
parser.add_argument("input_dir", help="Directory containing data dumped with slycat-dump.py.")
parser.add_argument("--couchdb-database", default="slycat", help="CouchDB database.  Default: %(default)s")
parser.add_argument("--couchdb-host", default="localhost", help="CouchDB host.  Default: %(default)s")
parser.add_argument("--couchdb-port", type=int, default=5984, help="CouchDB port.  Default: %(default)s")
parser.add_argument("--data-store", default="data-store",
                    help="Path to the hdf5 data storage directory.  Default: %(default)s")
parser.add_argument("--force", action="store_true", help="Overwrite existing data.")
parser.add_argument("--marking", default=[], nargs="+",
                    help="Use --marking='<source>:<target>' to map <source> markings to <target> markings.  You may specify multiple maps, separated by whitespace.")
arguments = parser.parse_args()

logging.getLogger().setLevel(logging.INFO)
logging.getLogger().addHandler(logging.StreamHandler())
logging.getLogger().handlers[0].setFormatter(logging.Formatter("{} - %(levelname)s - %(message)s".format(sys.argv[0])))

# Sanity check input arguments ...
markings = [marking.split(":") for marking in arguments.marking]
markings = dict([(source, target) for source, target in markings])

couchdb = couchdb.Server()[arguments.couchdb_database]

# Load projects ...
for source in glob.glob(os.path.join(arguments.input_dir, "project-*.json")):
    logging.info("Loading project %s", source)
    project = json.load(open(source))
    del project["_rev"]
    if arguments.force and project["_id"] in couchdb:
        del couchdb[project["_id"]]
    couchdb.save(project)

# Load models ...
for source in glob.glob(os.path.join(arguments.input_dir, "model-*.json")):
    logging.info("Loading model %s", source)
    model = json.load(open(source))
    del model["_rev"]
    if model["marking"] in markings:
        model["marking"] = markings[model["marking"]]
    if arguments.force and model["_id"] in couchdb:
        del couchdb[model["_id"]]
    couchdb.save(model)

# Load array sets ...
for source in glob.glob(os.path.join(arguments.input_dir, "array-set-*.hdf5")):
    logging.info("Loading array set %s", source)
    array = re.match(r".*array-set-(.*)\.hdf5", source).group(1)
    if arguments.force and array in couchdb:
        del couchdb[array]
    couchdb.save({"_id": array, "type": "hdf5"})
    destination = slycat.hdf5.path(array, arguments.data_store)
    if not os.path.exists(os.path.dirname(destination)):
        os.makedirs(os.path.dirname(destination))
    shutil.copy(source, destination)

# Load bookmarks ...
logging.info("Loading bookmarks")
for source in glob.glob(os.path.join(arguments.input_dir, "boomark-*.json")):
    boomark = json.load(open(source))
    del boomark["_rev"]
    if arguments.force and boomark["_id"] in couchdb:
        del couchdb[boomark["_id"]]
    couchdb.save(boomark)
logging.info("Loading bookmarks Done")

# Load bookmarks ...
logging.info("Loading references")
for source in glob.glob(os.path.join(arguments.input_dir, "reference-*.json")):
    logging.info("Loading references %s", source)
    reference = json.load(open(source))
    del reference["_rev"]
    if arguments.force and reference["_id"] in couchdb:
        del couchdb[reference["_id"]]
    couchdb.save(reference)
logging.info("Loading references Done")
