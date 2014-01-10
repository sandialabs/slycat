# Copyright 2013 Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000, there is a non-exclusive license for use of this work by
# or on behalf of the U.S. Government. Export of this program may require a
# license from the United States Government.

"""Compute statistics from an HDF5 timeseries dataset.

This script loads data from a directory containing:

    One inputs.hdf5 file containing a single input table.
    One timeseries-N.hdf5 file for each row in the input table.
"""

import argparse
import numpy
import os
import slycat.data.hdf5

parser = argparse.ArgumentParser()
parser.add_argument("directory", help="Directory containing hdf5 timeseries data (one inputs.hdf5 and multiple timeseries-N.hdf5 files).")
arguments = parser.parse_args()

with slycat.data.hdf5.open(os.path.join(arguments.directory, "inputs.hdf5")) as file:
  metadata = slycat.data.hdf5.get_array_metadata(file, 0)
attributes = metadata["attributes"]
dimensions = metadata["dimensions"]
attributes = slycat.data.array.require_attributes(attributes)
dimensions = slycat.data.array.require_dimensions(dimensions)
input_variable_count = len(attributes)
timeseries_count = dimensions[0]["end"] - dimensions[0]["begin"]

timeseries_variable_counts = numpy.zeros(timeseries_count)
timeseries_sample_counts = numpy.zeros(timeseries_count)

for timeseries in range(timeseries_count):
  with slycat.data.hdf5.open(os.path.join(arguments.directory, "timeseries-%s.hdf5" % timeseries)) as file:
    metadata = slycat.data.hdf5.get_array_metadata(file, 0)
  attributes = metadata["attributes"]
  dimensions = metadata["dimensions"]
  attributes = slycat.data.array.require_attributes(attributes)
  dimensions = slycat.data.array.require_dimensions(dimensions)
  timeseries_variable_counts[timeseries] = len(attributes) - 1 # We skip the timestamps
  timeseries_sample_counts[timeseries] = dimensions[0]["end"] - dimensions[0]["begin"]

print "Input variable count:", input_variable_count
print "Timeseries count:", timeseries_count
print "Timeseries variables min/mean/max:", timeseries_variable_counts.min(), timeseries_variable_counts.mean(), timeseries_variable_counts.max()
print "Timeseries samples min/mean/max/std:", timeseries_sample_counts.min(), timeseries_sample_counts.mean(), timeseries_sample_counts.max(), timeseries_sample_counts.std()
