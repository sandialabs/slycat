# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import numpy
import slycat.web.client
import sys

parser = slycat.web.client.option_parser()
parser.add_option("--bundling", type="int", default=10, help="Maximum number of rows to bundle into a single request.  Default: %default")
parser.add_option("--column-prefix", default="a", help="Column prefix.  Default: %default")
parser.add_option("--input-count", type="int", default=3, help="Input column count.  Default: %default")
parser.add_option("--marking", default="", help="Marking type.  Default: %default")
parser.add_option("--model-name", default="Demo CCA Model", help="New model name.  Default: %default")
parser.add_option("--output-count", type="int", default=3, help="Output column count.  Default: %default")
parser.add_option("--project-name", default="Demo CCA Project", help="New project name.  Default: %default")
parser.add_option("--row-count", type="int", default=100, help="Row count.  Default: %default")
parser.add_option("--seed", type="int", default=12345, help="Random seed.  Default: %default")
parser.add_option("--unused-count", type="int", default=3, help="Unused column count.  Default: %default")
options, arguments = parser.parse_args()

connection = slycat.web.client.connect(options)

numpy.random.seed(options.seed)

pid = connection.create_project(options.project_name)
wid = connection.create_cca_model_worker(pid, options.model_name, options.marking)
total_columns = options.input_count + options.output_count + options.unused_count
connection.start_table(wid, "data-table", ["%s%s" % (options.column_prefix, column) for column in range(total_columns)],["double" for column in range(total_columns)])
rows = []
for i in range(options.row_count):
  values = numpy.random.random(max(options.input_count, options.output_count))
  inputs = values[:options.input_count]
  outputs = [numpy.random.normal(value ** (index * 0.5), 0.2 * value ** (index * 0.5)) for index, value in enumerate(values[:options.output_count])]
  unused = numpy.random.random(options.unused_count)
  row = numpy.concatenate((inputs, unused, outputs))

  rows.append(row.tolist())
  if len(rows) >= options.bundling:
    connection.send_table_rows(wid, "data-table", rows)
    rows = []
connection.send_table_rows(wid, "data-table", rows)
connection.finish_table(wid, "data-table")

connection.set_parameter(wid, "input-columns", range(0, options.input_count))
connection.set_parameter(wid, "output-columns", range(options.input_count + options.unused_count, options.input_count + options.unused_count + options.output_count))
connection.set_parameter(wid, "scale-inputs", False)
mid = connection.finish_model(wid)
connection.join_worker(wid)
sys.stderr.write("Your new model is located at %s/models/%s\n" % (options.host, mid))
