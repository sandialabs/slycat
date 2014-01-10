# Copyright 2013 Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000, there is a non-exclusive license for use of this work by
# or on behalf of the U.S. Government. Export of this program may require a
# license from the United States Government.

"""Compare binned and unbinned versions of a timeseries.

This script loads data from a directory containing:

    One inputs.hdf5 file containing a single input table.
    One timeseries-N.hdf5 file for each row in the input table.
"""

import argparse
import matplotlib.pyplot as pyplot
import numpy
import scipy.interpolate
import os
import slycat.data.hdf5

parser = argparse.ArgumentParser()
parser.add_argument("directory", help="Directory containing hdf5 timeseries data (one inputs.hdf5 and multiple timeseries-N.hdf5 files).")
parser.add_argument("--bin-count", default=1000, type=int, help="Bin count.  Default: %(default)s")
parser.add_argument("--timeseries", default=0, type=int, help="Index of the timeseries to plot.  Default: %(default)s")
parser.add_argument("--variable", default=0, type=int, help="Index of the variable to plot.  Default: %(default)s")
arguments = parser.parse_args()

# Load the original data.
with slycat.data.hdf5.open(os.path.join(arguments.directory, "timeseries-%s.hdf5" % arguments.timeseries)) as file:
  times = slycat.data.hdf5.get_array_attribute(file, 0, 0)[...]
  values = slycat.data.hdf5.get_array_attribute(file, 0, arguments.variable + 1)[...]

# Compute uniform bins, based on the min and max times of the original data.
bin_times, bin_width = numpy.linspace(times.min(), times.max(), arguments.bin_count, retstep=True)

# Plot the original data.
pyplot.plot(times, values, "-", color=(0.7, 0.7, 0.7), label="Timeseries %s variable %s" % (arguments.timeseries, arguments.variable))

pyplot.plot(bin_times, scipy.interpolate.griddata(times, values, bin_times), "-", label="griddata")

#rbf = scipy.interpolate.Rbf(times, values, function="linear")
#pyplot.plot(bin_times, rbf(bin_times), "-", label="rbf")

pyplot.legend(loc="best")
pyplot.xlabel("Time")
pyplot.ylabel("Value")
pyplot.title(arguments.directory)
pyplot.show()

