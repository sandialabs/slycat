#!/bin/env python
# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

"""Uploads a CSV file to Slycat Web Server to compute a CCA model."""

import numpy
import slycat.web.client
import sys

parser = slycat.web.client.ArgumentParser(description="Create CCA model from .csv file.")
parser.add_argument("file", default="-", help="Input CSV file.  Use - for stdin.  Default: %(default)s")
parser.add_argument("--input", default=[], nargs="+", help="Input column(s).")
parser.add_argument("--marking", default="", help="Marking type.  Default: %(default)s")
parser.add_argument("--model-description", default="", help="New model description.  Default: %(default)s")
parser.add_argument("--model-name", default="CCA from CSV", help="New model name.  Default: %(default)s")
parser.add_argument("--no-join", default=False, action="store_true", help="Don't wait for the model to finish.")
parser.add_argument("--output", default=[], nargs="+", help="Output column(s).")
parser.add_argument("--project-description", default="", help="New project description.  Default: %(default)s")
parser.add_argument("--project-name", default="CCA from CSV", help="New project name.  Default: %(default)s")
parser.add_argument("--scale-inputs", default=False, action="store_true", help="Enable input scaling.")
arguments = parser.parse_args()

# Load row-oriented data into memory from the file.
stream = sys.stdin if arguments.file == "-" else open(arguments.file, "r")
rows = [row.split(",") for row in stream]

# Extract column names from the first line of the file, and assume that all columns contain string data.
column_names = [name.strip() for name in rows[0]]
column_types = ["string" for name in column_names]
rows = rows[1:]

# Convert from row-oriented to column-oriented data, and convert to numeric columns where possible.
columns = list(zip(*rows))
for index in range(len(columns)):
  try:
    columns[index] = numpy.array(columns[index], dtype=numpy.float64)
    column_types[index] = "float64"
  except:
    columns[index] = numpy.array(columns[index], dtype=numpy.str_)

# Sanity-check input arguments.
try:
  inputs = [column_names.index(input) for input in arguments.input]
except:
  raise Exception("Unknown input column.  Available columns: %s" % ", ".join(column_names))
try:
  outputs = [column_names.index(output) for output in arguments.output]
except:
  raise Exception("Unknown output column.  Available columns: %s" % ", ".join(column_names))
if len(inputs) < 1:
  raise Exception("You must specify at least one input column.  Available columns: %s" % ", ".join(column_names))
if len(outputs) < 1:
  raise Exception("You must specify at least one output column.  Available columns: %s" % ", ".join(column_names))
for input in inputs:
  if column_types[input] != "float64":
    raise Exception("Cannot analyze non-numeric input: %s" % column_names[input])
for output in outputs:
  if column_types[output] != "float64":
    raise Exception("Cannot analyze non-numeric output: %s" % column_names[output])

# Setup a connection to the Slycat Web Server.
connection = slycat.web.client.connect(arguments)

# Create a new project to contain our model.
pid = connection.find_or_create_project(arguments.project_name, arguments.project_description)

# Create the new, empty model.
mid = connection.post_project_models(pid, "cca", arguments.model_name, arguments.marking, arguments.model_description)

# Upload our observations as "data-table".
connection.put_model_arrayset(mid, "data-table")

# Start our single "data-table" array.
dimensions = [dict(name="row", end=len(rows))]
attributes = [dict(name=name, type=type) for name, type in zip(column_names, column_types)]
connection.put_model_arrayset_array(mid, "data-table", 0, dimensions, attributes)

# Upload data into the array.
for index, data in enumerate(columns):
  slycat.web.client.log.info("Uploading column {} of {} ({})".format(index, len(columns), column_names[index]))
  connection.put_model_arrayset_data(mid, "data-table", "0/%s/..." % index, [data])

# Store the remaining parameters.
connection.put_model_parameter(mid, "input-columns", inputs)
connection.put_model_parameter(mid, "output-columns", outputs)
connection.put_model_parameter(mid, "scale-inputs", arguments.scale_inputs)

# Signal that we're done uploading data to the model.  This lets Slycat Web
# Server know that it can start computation.
connection.post_model_finish(mid)
# Wait until the model is ready.
connection.join_model(mid)

# Supply the user with a direct link to the new model.
host = arguments.host
if arguments.port:
    host = host + ":" + arguments.port
slycat.web.client.log.info("Your new model is located at %s/models/%s" % (host, mid))
