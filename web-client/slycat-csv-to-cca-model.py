# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.
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

stream = sys.stdin if options.file == "-" else open(options.file, "r")
rows = [row.split(",") for row in stream]
column_names = [name.strip() for name in rows[0]]
column_types = ["string" for name in column_names]
column_count = len(column_names)
row_count = len(rows) - 1
columns = zip(*rows[1:])

for index in range(len(columns)):
  try:
    columns[index] = numpy.array(columns[index], dtype="float64")
    column_types[index] = "float64"
  except:
    pass

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

attributes = zip(column_names, column_types)
dimensions = [("row", "int64", 0, row_count)]

connection = slycat.web.client.connect(options)

pid = connection.find_or_create_project(options.project, options.project_name, options.project_description)
wid = connection.create_model_worker(pid, "cca3", options.model_name, options.marking, options.model_description)
connection.start_array_set(wid, "data-table")
connection.create_array(wid, "data-table", 0, attributes, dimensions)
for index, data in enumerate(columns):
  sys.stderr.write("Sending column {} of {} ({})\n".format(index, column_count, column_names[index]))
  connection.store_array_attribute(wid, "data-table", 0, index, data)
connection.finish_array_set(wid, "data-table")
connection.set_parameter(wid, "input-columns", inputs)
connection.set_parameter(wid, "output-columns", outputs)
connection.set_parameter(wid, "scale-inputs", options.scale_inputs)
mid = connection.finish_model(wid)

if not options.no_join:
  connection.join_worker(wid)
  connection.delete_worker(wid)
  sys.stderr.write("Your new model is located at %s/models/%s\n" % (options.host, mid))
