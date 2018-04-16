#!/bin/env python

# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

"""
Compute a timeseries model data from hdf5 data, saving to files for the Slycat
Web Server to ingest.

This script loads data from a directory containing:
  One inputs.hdf5 file containing a single table.
  One timeseries-N.hdf5 file for each row in the input table.
"""
import argparse
import collections
import datetime
import h5py
import ipyparallel
import itertools
import json
import numpy
import os
import scipy.cluster.hierarchy
import scipy.spatial.distance
import slycat.hdf5
import json
try:
  import cpickle as pickle
except:
  import pickle

parser = argparse.ArgumentParser()
parser.add_argument("directory", help="Directory containing hdf5 timeseries data (one inputs.hdf5 and multiple sub-directories with multiple timeseries-N.hdf5 files).")
parser.add_argument("--timeseries-name", default=None, help="Name of the timeseries, i.e. sub-directory name in the input directory.")
parser.add_argument("--cluster-sample-count", type=int, default=1000, help="Sample count used for the uniform-pla and uniform-paa resampling algorithms.  Default: %(default)s")
parser.add_argument("--cluster-sample-type", default="uniform-paa", choices=["uniform-pla", "uniform-paa"], help="Resampling algorithm type.  Default: %(default)s")
parser.add_argument("--cluster-type", default="average", choices=["single", "complete", "average", "weighted"], help="Hierarchical clustering method.  Default: %(default)s")
parser.add_argument("--cluster-metric", default="euclidean", choices=["euclidean"], help="Hierarchical clustering distance metric.  Default: %(default)s")
parser.add_argument("--workdir", default=None, help="Working directory to store data to be processed during model creation")
parser.add_argument("--hash", default=None, help="Unique identifier for the output folder.")
parser.add_argument("--profile", default=None, help="Name of the IPython profile to use")
arguments = parser.parse_args()

if arguments.timeseries_name is None:
  directory_full_path = arguments.directory
else:
  directory_full_path = os.path.join(arguments.directory, arguments.timeseries_name)

if not os.path.exists(directory_full_path):
  raise Exception("Directory %s does not exists." % directory_full_path)

if arguments.cluster_sample_count < 1:
  raise Exception("Cluster sample count must be greater than zero.")

_numSamples = arguments.cluster_sample_count

try:
  pool = ipyparallel.Client(profile=arguments.profile)[:]
except:
  raise Exception("A running IPython parallel cluster is required to run this script.")

# Compute the model.
try:
  print("Examining and verifying data.")
  """
  Find number of timeseries and accurate cluster sample count before starting model
  """
  if os.path.isfile(os.path.join(arguments.directory, "inputs.hdf5")):
    inputs_path = os.path.join(arguments.directory, "inputs.hdf5")
  else:
    inputs_path = os.path.join(os.path.dirname(arguments.directory), "inputs.hdf5")

  with h5py.File(inputs_path, "r") as file:
    array = slycat.hdf5.ArraySet(file)[0]
    dimensions = array.dimensions
    if len(dimensions) != 1:
      raise Exception("Inputs table must have exactly one dimension.")
    # size for the dataset, i.e. 5k, 10k, etc...
    _numTimeseries = dimensions[0]["end"] - dimensions[0]["begin"]

  # initialize a 1-dimensional array of size of the dataset with 0's
  timeseries_samples = numpy.zeros(shape=(_numTimeseries))
  for timeseries_index in range(_numTimeseries):
    with h5py.File(os.path.join(directory_full_path, "timeseries-%s.hdf5" % timeseries_index), "r") as file:
      # store all the timeseries sample counts
      timeseries_samples[timeseries_index] = len(slycat.hdf5.ArraySet(file)[0].get_data(0)[:])

  # reduce the num of samples if fewer timeseries that curr cluster-sample-count
  if timeseries_samples.min() < _numSamples:
    _numSamples = int(timeseries_samples.min())
    print("Reducing cluster sample count to minimum found in data: %s", _numSamples)


  print("Storing clustering parameters.")

  dirname = "%s/slycat_timeseries_%s" % (arguments.workdir, arguments.hash)
  if not os.path.exists(dirname):
    os.makedirs(dirname)

  with h5py.File(inputs_path, "r") as file:
    array = slycat.hdf5.ArraySet(file)[0]
    dimensions = array.dimensions
    attributes = array.attributes
    if len(attributes) < 1:
      raise Exception("Inputs table must have at least one attribute.")
    if len(dimensions) != 1:
      raise Exception("Inputs table must have exactly one dimension.")
    timeseries_count = dimensions[0]["end"] - dimensions[0]["begin"]

    """
    Save data to dictionary to be pickled. Slycat server will later un-pickle
    the file and use the data for the following commands:

    put_model_arrayset(mid, "inputs")
    put_model_arrayset_array(mid, "inputs", 0, dimensions, attributes)
    """
    arrayset_inputs = dict(aid="inputs", array=0, dimensions=dimensions, attributes=attributes)
    with open(os.path.join(dirname, "arrayset_inputs.pickle"), "wb") as arrayset_inputs_pickle:
      pickle.dump(arrayset_inputs, arrayset_inputs_pickle)

    """
    Fetch data for each of the attributes and pickle to disk. Slycat server will
    later un-pickle the files and use the data for the following command:

    put_model_arrayset_data(mid, "inputs", "0/%s/..." % attribute, [data])
    """
    attributes_array = numpy.empty(shape=(len(attributes),), dtype=object)
    for attribute in range(len(attributes)):
      print("Storing input table attribute %s", attribute)
      attributes_array[attribute] = array.get_data(attribute)[...]
    with open(os.path.join(dirname, "inputs_attributes_data.pickle"), "wb") as attributes_file:
      pickle.dump(attributes_array, attributes_file)


  # Create a mapping from unique cluster names to timeseries attributes.
  clusters = collections.defaultdict(list)
  timeseries_samples = numpy.zeros(shape=(timeseries_count))
  for timeseries_index in range(timeseries_count):
    with h5py.File(os.path.join(directory_full_path, "timeseries-%s.hdf5" % timeseries_index), "r") as file:
      attributes = slycat.hdf5.ArraySet(file)[0].attributes[1:] # Skip the timestamps
      # Get and store a shallow copy of the data
      timeseries_samples[timeseries_index] = len(slycat.hdf5.ArraySet(file)[0].get_data(0)[:])
    if len(attributes) < 1:
      raise Exception("A timeseries must have at least one attribute.")
    for attribute_index, attribute in enumerate(attributes):
      # Mapping is created here...
      clusters[attribute["name"]].append((timeseries_index, attribute_index))

  # Store an alphabetized collection of cluster names in a JSON file
  file_clusters = dict(aid="clusters", file=json.dumps(sorted(clusters.keys())), parser="slycat-blob-parser", timeseries_count=str(timeseries_count))
  with open(os.path.join(dirname, "file_clusters.json"), "w") as file_clusters_json:
    json.dump(file_clusters, file_clusters_json)
  with open(os.path.join(dirname, "file_clusters.out"), "wb") as file_clusters_out:
    json.dump(sorted(clusters.keys()), file_clusters_out)


  def get_time_range(directory, timeseries_index):
    """
    Get the minimum and maximum times for the input timeseries and returns the
    values as a tuple.

    :param directory: working directory for the timeseries
    :param timeseries_index:
    :returns: timeseries time range as tuple
    """
    import h5py
    import os
    import slycat.hdf5
    # We have to open the file with writing enabled in case the statistics cache gets updated.
    with h5py.File(os.path.join(directory, "timeseries-%s.hdf5" % timeseries_index), "r+") as file:
      statistics = slycat.hdf5.ArraySet(file)[0].get_statistics(0)
    return statistics["min"], statistics["max"]

  print("Collecting timeseries statistics.")
  time_ranges = pool.map_sync(get_time_range, list(itertools.repeat(directory_full_path, timeseries_count)), range(timeseries_count))

  # For each cluster ...
  for index, (name, storage) in enumerate(sorted(clusters.items())):
    print("cluster index: %s" % index)
    progress_begin = float(index) / float(len(clusters))
    progress_end = float(index + 1) / float(len(clusters))

    # Rebin each timeseries within the cluster so they share common stop/start times and samples.
    print("Resampling data for %s" % name)

    # Get the minimum and maximum times across every series in the cluster.
    ranges = [time_ranges[timeseries[0]] for timeseries in storage]
    time_min = min(zip(*ranges)[0])
    time_max = max(zip(*ranges)[1])

    if arguments.cluster_sample_type == "uniform-pla":

      def uniform_pla(directory, min_time, max_time, bin_count, timeseries_index, attribute_index):
        """
        Create waveforms using a piecewise linear approximation.

        :param directory: working directory for the timeseries
        :param min_time:
        :param max_time:
        :param bin_count:
        :param timeseries_index:
        :param attribute_index:
        :return: computed time series
        """
        import h5py
        import numpy
        import os
        import slycat.hdf5

        # generate evenly spaced times
        bin_edges = numpy.linspace(min_time, max_time, bin_count + 1)
        bin_times = (bin_edges[:-1] + bin_edges[1:]) / 2
        with h5py.File(os.path.join(directory, "timeseries-%s.hdf5" % timeseries_index), "r") as file:
          original_times = slycat.hdf5.ArraySet(file)[0].get_data(0)[:]
          original_values = slycat.hdf5.ArraySet(file)[0].get_data(attribute_index + 1)[:]
        # interpolate original data with binned times
        bin_values = numpy.interp(bin_times, original_times, original_values)
        return {
          "input-index" : timeseries_index,
          "times" : bin_times,
          "values" : bin_values,
        }

      directories = list(itertools.repeat(directory_full_path, len(storage)))
      min_times = list(itertools.repeat(time_min, len(storage)))
      max_times = list(itertools.repeat(time_max, len(storage)))
      bin_counts = list(itertools.repeat(_numSamples, len(storage)))
      timeseries_indices = [timeseries for timeseries, attribute in storage]
      attribute_indices = [attribute for timeseries, attribute in storage]
      waveforms = pool.map_sync(uniform_pla, directories, min_times, max_times, bin_counts, timeseries_indices, attribute_indices)

    elif arguments.cluster_sample_type == "uniform-paa":

      def uniform_paa(directory, min_time, max_time, bin_count, timeseries_index, attribute_index):
        """
        Create waveforms using a piecewise aggregate approximation.

        :param directory: working directory for the timeseries
        :param min_time:
        :param max_time:
        :param bin_count:
        :param timeseries_index:
        :param attribute_index:
        :return: computed time series
        """
        import h5py
        import numpy
        import os
        import slycat.hdf5

        bin_edges = numpy.linspace(min_time, max_time, bin_count + 1)
        bin_times = (bin_edges[:-1] + bin_edges[1:]) / 2
        with h5py.File(os.path.join(directory, "timeseries-%s.hdf5" % timeseries_index), "r") as file:
          original_times = slycat.hdf5.ArraySet(file)[0].get_data(0)[:]
          original_values = slycat.hdf5.ArraySet(file)[0].get_data(attribute_index + 1)[:]
        bin_indices = numpy.digitize(original_times, bin_edges[1:])
        bin_counts = numpy.bincount(bin_indices, minlength=bin_count+1)[1:]
        bin_sums = numpy.bincount(bin_indices, original_values, minlength=bin_count+1)[1:]
        lonely_bins = (bin_counts < 2)
        bin_counts[lonely_bins] = 1
        bin_sums[lonely_bins] = numpy.interp(bin_times, original_times, original_values)[lonely_bins]
        bin_values = bin_sums / bin_counts
        return {
          "input-index" : timeseries_index,
          "times" : bin_times,
          "values" : bin_values,
        }

      directories = list(itertools.repeat(directory_full_path, len(storage)))
      min_times = list(itertools.repeat(time_min, len(storage)))
      max_times = list(itertools.repeat(time_max, len(storage)))
      bin_counts = list(itertools.repeat(_numSamples, len(storage)))
      timeseries_indices = [timeseries for timeseries, attribute in storage]
      attribute_indices = [attribute for timeseries, attribute in storage]
      waveforms = pool.map_sync(uniform_paa, directories, min_times, max_times, bin_counts, timeseries_indices, attribute_indices)

    # Compute a distance matrix comparing every series to every other ...
    observation_count = len(waveforms)
    distance_matrix = numpy.zeros(shape=(observation_count, observation_count))
    for i in range(0, observation_count):
      print("Computing distance matrix for %s, %s of %s" % (name, i+1, observation_count))
      for j in range(i + 1, observation_count):
        distance = numpy.sqrt(numpy.sum(numpy.power(waveforms[j]["values"] - waveforms[i]["values"], 2.0)))
        distance_matrix[i, j] = distance
        distance_matrix[j, i] = distance

    # Use the distance matrix to cluster observations ...
    print("Clustering %s" % name)
    distance = scipy.spatial.distance.squareform(distance_matrix)
    linkage = scipy.cluster.hierarchy.linkage(distance, method=str(arguments.cluster_type), metric=str(arguments.cluster_metric))

    # Identify exemplar waveforms for each cluster ...
    summed_distances = numpy.zeros(shape=(observation_count))
    exemplars = dict()
    cluster_membership = []

    for i in range(observation_count):
      exemplars[i] = i
      cluster_membership.append(set([i]))

    print("Identifying examplars for %s" % (name))
    for i in range(len(linkage)):
      cluster_id = i + observation_count
      (f_cluster1, f_cluster2, height, total_observations) = linkage[i]
      cluster1 = int(f_cluster1)
      cluster2 = int(f_cluster2)
      # Housekeeping: assemble the membership of the new cluster
      cluster_membership.append(cluster_membership[cluster1].union(cluster_membership[cluster2]))

      # We need to update the distance from each member of the new
      # cluster to all the other members of the cluster.  That means
      # that for all the members of cluster1, we need to add in the
      # distances to members of cluster2, and for all members of
      # cluster2, we need to add in the distances to members of
      # cluster1.
      for cluster1_member in cluster_membership[cluster1]:
        for cluster2_member in cluster_membership[cluster2]:
          summed_distances[cluster1_member] += distance_matrix[cluster1_member][cluster2_member]

      for cluster2_member in cluster_membership[int(cluster2)]:
        for cluster1_member in cluster_membership[cluster1]:
          summed_distances[cluster2_member] += distance_matrix[cluster2_member][cluster1_member]

      min_summed_distance = None
      max_summed_distance = None

      exemplar_id = 0
      for member in cluster_membership[cluster_id]:
        if min_summed_distance is None or summed_distances[member] < min_summed_distance:
          min_summed_distance = summed_distances[member]
          exemplar_id = member

        if max_summed_distance is None or summed_distances[member] > min_summed_distance:
          max_summed_distance = summed_distances[member]

      exemplars[cluster_id] = exemplar_id

    # Store the cluster.
    print("Storing %s" % name)
    file_cluster_n = dict(aid="cluster-%s" % name, parser="slycat-blob-parser")
    with open(os.path.join(dirname, "file_cluster_%s.json" % name), "w") as file_cluster_n_json:
      json.dump(file_cluster_n, file_cluster_n_json)
    with open(os.path.join(dirname, "file_cluster_%s.out" % name), "w") as file_cluster_n_out:
      json.dump({
        "linkage": linkage.tolist(),
        "exemplars": exemplars,
        "input-indices": [waveform["input-index"] for waveform in waveforms]
        }, file_cluster_n_out)

    arrayset_name = "preview-%s" % name
    dimensions_array = numpy.empty(shape=(len(waveforms),), dtype=object)
    attributes_array = numpy.empty(shape=(len(waveforms),), dtype=object)
    waveform_times_array = numpy.empty(shape=(len(waveforms),), dtype=object)
    waveform_values_array = numpy.empty(shape=(len(waveforms),), dtype=object)
    
    for index, waveform in enumerate(waveforms):
      dimensions_array[index] = [dict(name="sample", end=len(waveform["times"]))]
      attributes_array[index] = [dict(name="time", type="float64"), dict(name="value", type="float64")]
      waveform_times_array[index] = waveform["times"]
      waveform_values_array[index] = waveform["values"]

    print("Creating array %s %s" % (attributes, dimensions))
    with open(os.path.join(dirname, "waveform_%s_dimensions.pickle" % name), "wb") as dimensions_file:
      pickle.dump(dimensions_array, dimensions_file)
    with open(os.path.join(dirname, "waveform_%s_attributes.pickle" % name), "wb") as attributes_file:
      pickle.dump(attributes_array, attributes_file)
    with open(os.path.join(dirname, "waveform_%s_times.pickle" % name), "wb") as times_file:
      pickle.dump(waveform_times_array, times_file)
    with open(os.path.join(dirname, "waveform_%s_values.pickle" % name), "wb") as values_file:
      pickle.dump(waveform_values_array, values_file)

except:
  import traceback
  print(traceback.format_exc())

print("done.")
