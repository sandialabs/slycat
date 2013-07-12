# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import numpy
import slycat.client
import sys

parser = slycat.client.option_parser()
parser.add_option("--cluster-bin-count", type="int", default=500, help="Cluster bin count.  Default: %default")
parser.add_option("--cluster-bin-type", default="naive", help="Cluster bin type.  Default: %default")
parser.add_option("--cluster-type", default="average", help="Clustering type.  Default: %default")
parser.add_option("--input-prefix", default="a", help="Input variable prefix.  Default: %default")
parser.add_option("--marking", default="", help="Marking type.  Default: %default")
parser.add_option("--output-count", type="int", default=2, help="Number of output variables.  Default: %default")
parser.add_option("--output-prefix", default="b", help="Output variable prefix.  Default: %default")
parser.add_option("--seed", type="int", default=12345, help="Random seed.  Default: %default")
parser.add_option("--timeseries-bundling", type="int", default=10000, help="Maximum number of timeseries rows to send at once.  Default: %default")
parser.add_option("--timeseries-count", type="int", default=10, help="Number of timeseries per output variable.  Default: %default")
parser.add_option("--timeseries-samples", type="int", default=15000, help="Number of samples in each timeseries.  Default: %default")
parser.add_option("--timeseries-waves", type="int", default=4, help="Number of random sine waves to sum for each timeseries.  Default: %default")
options, arguments = parser.parse_args()

numpy.random.seed(options.seed)

connection = slycat.client.connect(options)

pid = connection.create_project("Timeseries Serial Model Test")
mwid = connection.create_timeseries_model_worker(pid, "Model", options.marking)

# Set-aside storage for our "input" variables ...
inputs = numpy.random.random((options.timeseries_count, options.output_count * options.timeseries_waves))

# For each "output" variable ...
for output in range(options.output_count):
  sys.stderr.write("Generating output variable %s%s.\n" % (options.output_prefix, output))
  name = "output-%s" % output
  connection.start_timeseries(mwid, name, ["%s%s" % (options.output_prefix, output)], ["double"])
  for id in range(options.timeseries_count):
    sys.stderr.write("  Generating timeseries %s.\n" % id)
    ids = numpy.zeros(options.timeseries_samples, dtype=numpy.int64) + id
    times = numpy.linspace(0, 2 * numpy.pi, options.timeseries_samples)
    coefficients = sorted(numpy.random.random(options.timeseries_waves) * 8 + 1)
    values = numpy.zeros(ids.shape)
    for k in coefficients:
      values += numpy.sin(times * k) / k
    for i in range(0, len(ids), options.timeseries_bundling):
      connection.send_timeseries_columns(mwid, name, ids[i:i+options.timeseries_bundling], times[i:i+options.timeseries_bundling], values[i:i+options.timeseries_bundling])
  connection.finish_timeseries(mwid, name)

connection.start_table(mwid, "inputs", ["%s%s" % (options.input_prefix, column) for column in range(inputs.shape[1])],["double" for column in range(inputs.shape[1])])
for row in inputs:
  connection.send_table_rows(mwid, "inputs", [row])
connection.finish_table(mwid, "inputs")

# Store the remaining parameters ...
connection.set_parameter(mwid, "output-count", options.output_count)
connection.set_parameter(mwid, "cluster-bin-count", options.cluster_bin_count)
connection.set_parameter(mwid, "cluster-bin-type", options.cluster_bin_type)
connection.set_parameter(mwid, "cluster-type", options.cluster_type)
mid = connection.finish_model(mwid)

sys.stderr.write("Your new model will be at %s/models/%s when complete.\n" % (options.host, mid))
