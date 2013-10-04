# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import numpy
import slycat.web.client
import sys

parser = slycat.web.client.option_parser()
parser.add_option("--bundling", type="int", default=10, help="Maximum number of rows to bundle into a single request.  Default: %default")
parser.add_option("--column-prefix", default="a", help="Column prefix.  Default: %default")
parser.add_option("--duplicate-input-count", type="int", default=0, help="Number of input columns to duplicate.  Default: %default")
parser.add_option("--duplicate-output-count", type="int", default=0, help="Number of output columns to duplicate.  Default: %default")
parser.add_option("--input-count", type="int", default=3, help="Input column count.  Default: %default")
parser.add_option("--marking", default="", help="Marking type.  Default: %default")
parser.add_option("--model-name", default="Demo CCA Model", help="New model name.  Default: %default")
parser.add_option("--output-count", type="int", default=3, help="Output column count.  Default: %default")
parser.add_option("--project-name", default="Demo CCA Project", help="New project name.  Default: %default")
parser.add_option("--row-count", type="int", default=100, help="Row count.  Default: %default")
parser.add_option("--seed", type="int", default=12345, help="Random seed.  Default: %default")
parser.add_option("--unused-count", type="int", default=3, help="Unused column count.  Default: %default")
options, arguments = parser.parse_args()

if options.input_count < 1:
  raise Exception("Input count must be greater-than zero.")
if options.output_count < 1:
  raise Exception("Output count must be greater-than zero.")
if options.duplicate_input_count >= options.input_count:
  raise Exception("Duplicate input count must be less than input count.")
if options.duplicate_output_count >= options.output_count:
  raise Exception("Duplicate output count must be less than output count.")

total_columns = options.input_count + options.output_count + options.unused_count

# Create some random data using a gaussian distribution ...
numpy.random.seed(options.seed)
data = numpy.random.normal(size=(options.row_count, total_columns))

# Force a somewhat-linear relationship between the inputs and outputs ...
for i in range(options.input_count, options.input_count + min(options.input_count, options.output_count)):
  data[:, i] = data[:, 0] ** i

# Optionally duplicate some columns to create rank-deficient data ...
for i in range(1, 1 + options.duplicate_input_count):
  data[:,i] = data[:,0]
for i in range(1 + options.input_count, 1 + options.input_count + options.duplicate_output_count):
  data[:,i] = data[:, options.input_count]

connection = slycat.web.client.connect(options)
pid = connection.create_project(options.project_name)
wid = connection.create_cca_model_worker(pid, options.model_name, options.marking)
connection.start_table(wid, "data-table", ["%s%s" % (options.column_prefix, column) for column in range(total_columns)],["double" for column in range(total_columns)])
for row_begin in range(0, options.row_count, options.bundling):
  row_end = min(options.row_count, row_begin + options.bundling)
  connection.send_table_rows(wid, "data-table", data[row_begin:row_end].tolist())
connection.finish_table(wid, "data-table")

connection.set_parameter(wid, "input-columns", range(0, options.input_count))
connection.set_parameter(wid, "output-columns", range(options.input_count, options.input_count + options.output_count))
connection.set_parameter(wid, "scale-inputs", False)
mid = connection.finish_model(wid)
connection.join_worker(wid)
sys.stderr.write("Your new model is located at %s/models/%s\n" % (options.host, mid))
