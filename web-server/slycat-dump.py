# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import argparse
import couchdb
import json
import logging
import os
import shutil
import slycat.hdf5
import slycat.email
import sys

parser = argparse.ArgumentParser()
parser.add_argument("output_dir", help="Directory where results will be stored.")
parser.add_argument("--all", action="store_true", help="Dump all projects.")
parser.add_argument("--couchdb-database", default="slycat", help="CouchDB database.  Default: %(default)s")
parser.add_argument("--couchdb-host", default="localhost", help="CouchDB host.  Default: %(default)s")
parser.add_argument("--couchdb-port", type=int, default=5984, help="CouchDB port.  Default: %(default)s")
parser.add_argument("--data-store", default="data-store", help="Path to the hdf5 data storage directory.  Default: %(default)s")
parser.add_argument("--force", action="store_true", help="Overwrite existing data.")
parser.add_argument("--project-id", default=[], action="append", help="Project ID to dump.  You may specify --project-id multiple times.")
arguments = parser.parse_args()

logging.getLogger().setLevel(logging.INFO)
logging.getLogger().addHandler(logging.StreamHandler())
logging.getLogger().handlers[0].setFormatter(logging.Formatter("{} - %(levelname)s - %(message)s".format(sys.argv[0])))

if arguments.force and os.path.exists(arguments.output_dir):
  shutil.rmtree(arguments.output_dir)
if os.path.exists(arguments.output_dir):
  raise Exception("Output directory already exists.")

couchdb = couchdb.Server()[arguments.couchdb_database]

os.makedirs(arguments.output_dir)

if arguments.all:
  arguments.project_id = set(arguments.project_id + [row["id"] for row in couchdb.view("slycat/projects")])

logging.info("Dumping bookmarks")
for bookmark in couchdb.view("slycat/project-bookmarks"):
  json.dump(bookmark, open(os.path.join(arguments.output_dir, "bookmark-%s.json" % bookmark["id"]), "w"))
logging.info("Done with bookmarks")


for project_id in arguments.project_id:
  logging.info("Dumping project %s", project_id)
  project = couchdb.get(project_id, attachments=True)
  json.dump(project, open(os.path.join(arguments.output_dir, "project-%s.json" % project["_id"]), "w"))

  project_arrays = set()

  for row in couchdb.view("slycat/project-models", startkey=project_id, endkey=project_id):
    logging.info("Dumping model %s", row["id"])
    model = couchdb.get(row["id"], attachments=True)
    json.dump(model, open(os.path.join(arguments.output_dir, "model-%s.json" % model["_id"]), "w"))

    artifact_types = model["artifact-types"]
    for key, value in model.items():
      if not key.startswith("artifact:"):
        continue
      artifact_name = key[9:]
      artifact_type = artifact_types[artifact_name]
      if artifact_type == "hdf5":
        if value not in project_arrays:
          logging.info("Dumping array set %s", value)
          project_arrays.add(value)
          shutil.copy(slycat.hdf5.path(value, arguments.data_store), os.path.join(arguments.output_dir, "array-set-%s.hdf5" % value))
      elif artifact_type in ["file", "json"]:
        continue # file artifacts are stored as document attachments, and json artifacts are stored document directly, so we don't have to do anything for them.
      else:
        logging.warning("Skipping unsupported artifact type: %s %s", artifact_name, artifact_type)

