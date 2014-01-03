# Copyright 2013 Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000, there is a non-exclusive license for use of this work by
# or on behalf of the U.S. Government. Export of this program may require a
# license from the United States Government.

"""Compute a timeseries model locally from hdf5 data, uploading the results to Slycat Web Server.

This script loads data from a directory containing:

    One inputs.hdf5 file containing a single table.
    One outputs.hdf5 file containing multiple timeseries.
"""

import concurrent.futures
import multiprocessing
import numpy
import os
import slycat.data.hdf5
import slycat.model.timeseries
import slycat.web.client

parser = slycat.web.client.option_parser()
parser.add_argument("directory", help="Directory containing hdf5 timeseries data (one inputs.hdf5 and one outputs.hdf5 file).")
parser.add_argument("--cluster-bin-count", type=int, default=100, help="Cluster bin count.  Default: %(default)s")
parser.add_argument("--cluster-bin-type", default="naive", help="Cluster bin type.  Default: %(default)s")
parser.add_argument("--cluster-type", default="average", help="Clustering type.  Default: %(default)s")
parser.add_argument("--marking", default="", help="Marking type.  Default: %(default)s")
parser.add_argument("--model-description", default="", help="New model description.  Default: %(default)s")
parser.add_argument("--model-name", default="HDF5-Timeseries", help="New model name.  Default: %(default)s")
parser.add_argument("--parallel-jobs", "-j", default=multiprocessing.cpu_count(), type=int, help="Number of parallel jobs to run.  Default: %(default)s")
parser.add_argument("--project-description", default="", help="New project description.  Default: %(default)s")
parser.add_argument("--project-name", default="HDF5-Timeseries", help="New or existing project name.  Default: %(default)s")
arguments = parser.parse_args()

class hdf5_inputs(slycat.model.timeseries.input_strategy):
  def get_input_metadata(self):
    with slycat.data.hdf5.open(os.path.join(arguments.directory, "inputs.hdf5")) as inputs:
      metadata = slycat.data.hdf5.get_array_metadata(inputs, 0)
    return metadata["attributes"], metadata["dimensions"]

  def get_input_attribute(self, attribute):
    with slycat.data.hdf5.open(os.path.join(arguments.directory, "inputs.hdf5")) as inputs:
      return slycat.data.hdf5.get_array_attribute(inputs, 0, attribute)[...]

  def get_timeseries_attributes(self, index):
    with slycat.data.hdf5.open(os.path.join(arguments.directory, "timeseries-%s.hdf5" % index)) as outputs:
      metadata = slycat.data.hdf5.get_array_metadata(outputs, index)
    return metadata["attributes"][1:] # Skip the timestamps

  def get_timeseries_time_range(self, index):
    with slycat.data.hdf5.open(os.path.join(arguments.directory, "timeseries-%s.hdf5" % index)) as outputs:
      metadata = slycat.data.hdf5.get_array_metadata(outputs, index)
    return metadata["statistics"][0]["min"], metadata["statistics"][0]["max"]

  def get_timeseries_times(self, index):
    with slycat.data.hdf5.open(os.path.join(arguments.directory, "timeseries-%s.hdf5" % index)) as outputs:
      return slycat.data.hdf5.get_array_attribute(outputs, index, 0)[...]

  def get_timeseries_attribute(self, index, attribute):
    with slycat.data.hdf5.open(os.path.join(arguments.directory, "timeseries-%s.hdf5" % index)) as outputs:
      return slycat.data.hdf5.get_array_attribute(outputs, index, attribute + 1)[...]

# Setup a connection to the Slycat Web Server.
connection = slycat.web.client.connect(arguments)

# Create a new project to contain our model.
pid = connection.find_or_create_project(arguments.project_name, arguments.project_description)

# Create the new, empty model.
mid = connection.create_model(pid, "timeseries", arguments.model_name, arguments.marking, arguments.model_description)

# Compute the model.
slycat.model.timeseries.compute(slycat.web.client.log, concurrent.futures.ThreadPoolExecutor(arguments.parallel_jobs), hdf5_inputs(), slycat.model.timeseries.client_storage_strategy(connection, mid), arguments.cluster_bin_type, arguments.cluster_bin_count, arguments.cluster_type)

# Supply the user with a direct link to the new model.
slycat.web.client.log.info("Your new model is located at %s/models/%s" % (arguments.host, mid))
