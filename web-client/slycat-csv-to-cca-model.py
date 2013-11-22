# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

"""Uploads a CSV file to Slycat Web Server to compute a CCA model."""

import math
import numpy
import slycat.web.client
import StringIO
import sys

parser = slycat.web.client.option_parser()
parser.add_option("--file", default="-", help="Input CSV file.  Use - for stdin.  Default: %default")
parser.add_option("--input", default=[], action="append", help="Input column.  Use an --input argument for each input column.")
parser.add_option("--marking", default="", help="Marking type.  Default: %default")
parser.add_option("--model-description", default="", help="New model description.  Default: %default")
parser.add_option("--model-name", default="CSV-to-CCA", help="New model name.  Default: %default")
parser.add_option("--no-join", default=False, action="store_true", help="Don't wait for the model to finish.")
parser.add_option("--output", default=[], action="append", help="Input column.  Use an --input argument for each input column.")
parser.add_option("--project", default=None, help="Name of an existing project.  Default: create a new project.")
parser.add_option("--project-description", default="", help="New project description.  Default: %default")
parser.add_option("--project-name", default="CSV-to-CCA", help="New project name.  Default: %default")
parser.add_option("--scale-inputs", default=False, action="store_true", help="Enable input scaling.")
options, arguments = parser.parse_args()

# Load row-oriented data into memory from the file.
stream = sys.stdin if options.file == "-" else open(options.file, "r")
rows = [row.split(",") for row in stream]

# Extract column names from the first line of the file, and assume that all columns contain string data.
column_names = [name.strip() for name in rows[0]]
column_types = ["string" for name in column_names]
rows = rows[1:]

# Convert from row-oriented to column-oriented data, and convert to numeric columns where possible.
columns = zip(*rows[1:])
for index in range(len(columns)):
  try:
    columns[index] = numpy.array(columns[index], dtype="float64")
    column_types[index] = "float64"
  except:
    pass

# Sanity-check input arguments.
try:
  inputs = [column_names.index(input) for input in options.input]
except:
  raise Exception("Unknown input column.  Available columns: %s" % ", ".join(column_names))
try:
  outputs = [column_names.index(output) for output in options.output]
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
connection = slycat.web.client.connect(options)

# Create a new project to contain our model.
pid = connection.find_or_create_project(options.project, options.project_name, options.project_description)

# Create the new, empty model.
mid = connection.create_model(pid, "cca", options.model_name, options.marking, options.model_description)

# Upload our observations as "data-table".
connection.start_array_set(mid, "data-table")

# Start our single "data-table" array.
attributes = zip(column_names, column_types)
dimensions = [("row", "int64", 0, len(rows))]
connection.start_array(mid, "data-table", 0, attributes, dimensions)

# Upload data into the array.
for index, data in enumerate(columns):
  sys.stderr.write("Sending column {} of {} ({})\n".format(index, len(columns), column_names[index]))
  connection.store_array_attribute(mid, "data-table", 0, index, data)

# Store the remaining parameters.
connection.store_parameter(mid, "input-columns", inputs)
connection.store_parameter(mid, "output-columns", outputs)
connection.store_parameter(mid, "scale-inputs", options.scale_inputs)

# Signal that we're done uploading data to the model.  This lets Slycat Web
# Server know that it can start computation.
connection.finish_model(mid)
# Wait until the model is ready.
connection.join_model(mid)

# Supply the user with a direct link to the new model.
sys.stderr.write("Your new model is located at %s/models/%s\n" % (options.host, mid))
