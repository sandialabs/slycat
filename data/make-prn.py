# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import numpy
import optparse
import sys

parser = optparse.OptionParser()
parser.add_option("--observation-count", type="int", default=1000, help="Number of observations.  Default: %default")
parser.add_option("--seed", type="int", default=1234, help="Random seed.  Default: %default")
parser.add_option("--terminator", default=False, action="store_true", help="Add a termination message at the end of the file.")
parser.add_option("--variable-count", type="int", default=3, help="Number of variables.  Default: %default")
options, arguments = parser.parse_args()

numpy.random.seed(options.seed)

index = numpy.arange(options.observation_count).astype("int64")
time = numpy.linspace(1e-5, 10, index.shape[0])
variables = []
for i in range(options.variable_count):
  coefficients = numpy.random.random(4) * 8 + 1
  variable = numpy.zeros(index.shape[0])
  for k in coefficients:
    variable += numpy.sin(time * k) / k
  variables.append(variable)

sys.stdout.write(" ".join(["Index", "TIME"] + ["V(%s)" % j for j in range(len(variables))]))
sys.stdout.write("\n")
for i in range(index.shape[0]):
  sys.stdout.write("%s %s" % (index[i], time[i]))
  for variable in variables:
    sys.stdout.write(" %s" % (variable[i]))
  sys.stdout.write("\n")
if options.terminator:
  sys.stdout.write("End of Xyce(TM) Simulation\n")
