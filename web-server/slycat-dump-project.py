# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import json
import os
import pprint
import shutil
import slycat.web.client
import subprocess
import sys
import StringIO

parser = slycat.web.client.option_parser()
parser.add_option("--force", default=False, action="store_true", help="Overwrite existing data.")
parser.add_option("--project-id", help="Project ID to dump.")
parser.add_option("--output-dir", help="Directory for storing results.")
options, arguments = parser.parse_args()

if options.project_id is None:
  raise Exception("--project-id is required.")
if options.output_dir is None:
  raise Exception("--output-dir is required.")

if options.force and os.path.exists(options.output_dir):
  shutil.rmtree(options.output_dir)
if os.path.exists(options.output_dir):
  raise Exception("Output directory already exists.")

try:
  coordinator_dir = StringIO.StringIO(subprocess.check_output(["iquery", "-aq", "list('instances')"])).readlines()[1].split(",")[-1].strip()[1:-1]
except:
  raise Exception("Couldn't query SciDB for the coordinator directory.")

os.makedirs(options.output_dir)

connection = slycat.web.client.connect(options)
project = connection.get_project(options.project_id)
project_dir = options.output_dir
json.dump(project, open(os.path.join(project_dir, "project.json"), "w"))

models = connection.get_project_models(options.project_id)
for model in models:
  model_dir = os.path.join(project_dir, "model-%s" % model["_id"])
  os.mkdir(model_dir)
  json.dump(model, open(os.path.join(model_dir, "model.json"), "w"))

  for artifact, value in model.items():
    if not artifact.startswith("artifact:"):
      continue
    if not isinstance(value, dict):
      continue
    for array, id in value.items():
      print array, id
