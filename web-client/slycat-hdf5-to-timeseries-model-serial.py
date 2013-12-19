# Copyright 2013 Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000, there is a non-exclusive license for use of this work by
# or on behalf of the U.S. Government. Export of this program may require a
# license from the United States Government.

"""Compute a timeseries model locally from hdf5 data, uploading the results to Slycat Web Server.

This script loads data from a directory containing:

    One inputs.hdf5 file containing a single table.
    One outputs.hdf5 file containing multiple timeseries.
"""

import numpy
import os
import slycat.data.hdf5
import slycat.web.client.model.timeseries

parser = slycat.web.client.option_parser()
parser.add_argument("directory", help="Directory containing hdf5 timeseries data (one inputs.hdf5 and one outputs.hdf5 file).")
parser.add_argument("--cluster-bin-count", type=int, default=100, help="Cluster bin count.  Default: %(default)s")
parser.add_argument("--cluster-bin-type", default="naive", help="Cluster bin type.  Default: %(default)s")
parser.add_argument("--cluster-type", default="average", help="Clustering type.  Default: %(default)s")
parser.add_argument("--marking", default="", help="Marking type.  Default: %(default)s")
parser.add_argument("--model-description", default="", help="New model description.  Default: %(default)s")
parser.add_argument("--model-name", default="HDF5-Timeseries", help="New model name.  Default: %(default)s")
parser.add_argument("--project-description", default="", help="New project description.  Default: %(default)s")
parser.add_argument("--project-name", default="HDF5-Timeseries", help="New or existing project name.  Default: %(default)s")
arguments = parser.parse_args()

class timeseries(slycat.web.client.model.timeseries.serial):
  def get_input_metadata(self):
    with slycat.data.hdf5.open(os.path.join(arguments.directory, "inputs.hdf5")) as inputs:
      attributes, dimensions, statistics = slycat.data.hdf5.get_array_metadata(inputs, 0)
    return attributes, dimensions

  def get_input_attribute(self, attribute):
    with slycat.data.hdf5.open(os.path.join(arguments.directory, "inputs.hdf5")) as inputs:
      return slycat.data.hdf5.get_array_attribute(inputs, 0, attribute)

  def get_timeseries_attributes(self, index):
    with slycat.data.hdf5.open(os.path.join(arguments.directory, "outputs.hdf5")) as outputs:
      attributes, dimensions, statistics = slycat.data.hdf5.get_array_metadata(outputs, index)
    return attributes[1:] # Skip the timestamps

  def get_timeseries_time_range(self, index):
    with slycat.data.hdf5.open(os.path.join(arguments.directory, "outputs.hdf5")) as outputs:
      attributes, dimensions, statistics = slycat.data.hdf5.get_array_metadata(outputs, index)
    return statistics[0]["min"], statistics[0]["max"]

  def get_timeseries_times(self, index):
    with slycat.data.hdf5.open(os.path.join(arguments.directory, "outputs.hdf5")) as outputs:
      return slycat.data.hdf5.get_array_attribute(outputs, index, 0)

  def get_timeseries_attribute(self, index, attribute):
    with slycat.data.hdf5.open(os.path.join(arguments.directory, "outputs.hdf5")) as outputs:
      return slycat.data.hdf5.get_array_attribute(outputs, index, attribute + 1)

# Setup a connection to the Slycat Web Server.
connection = slycat.web.client.connect(arguments)

# Create a new project to contain our model.
pid = connection.find_or_create_project(arguments.project_name, arguments.project_description)

# Create the new, empty model.
mid = connection.create_model(pid, "timeseries", arguments.model_name, arguments.marking, arguments.model_description)

# Compute the model.
model = timeseries(connection, mid, arguments.cluster_bin_type, arguments.cluster_bin_count, arguments.cluster_type)
model.compute()

# Supply the user with a direct link to the new model.
slycat.web.client.log.info("Your new model is located at %s/models/%s" % (arguments.host, mid))
