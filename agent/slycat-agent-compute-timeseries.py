#!/bin/env python

# Copyright 2013 Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000, there is a non-exclusive license for use of this work by
# or on behalf of the U.S. Government. Export of this program may require a
# license from the United States Government.

import collections
import datetime
import h5py
import IPython.parallel
import itertools
import json
import numpy
import os
import scipy.cluster.hierarchy
import scipy.spatial.distance
import argparse
import hdf5

parser = argparse.ArgumentParser()
parser.add_argument("directory", help="Directory containing hdf5 timeseries data (one inputs.hdf5 and multiple timeseries-N.hdf5 files).")
parser.add_argument("--cluster-sample-count", type=int, default=1000, help="Sample count used for the uniform-pla and uniform-paa resampling algorithms.  Default: %(default)s")
parser.add_argument("--cluster-sample-type", default="uniform-paa", choices=["uniform-pla", "uniform-paa"], help="Resampling algorithm type.  Default: %(default)s")
parser.add_argument("--cluster-type", default="average", choices=["single", "complete", "average", "weighted"], help="Hierarchical clustering method.  Default: %(default)s")
parser.add_argument("--cluster-metric", default="euclidean", choices=["euclidean"], help="Hierarchical clustering distance metric.  Default: %(default)s")
parser.add_argument("--profile", default=None, help="Name of the IPython profile to use")
parser.add_argument("--output", default=None, help="Output directory")
arguments = parser.parse_args()

if arguments.cluster_sample_count < 1:
  raise Exception("Cluster sample count must be greater than zero.")

_numSamples = arguments.cluster_sample_count

try:
  pool = IPython.parallel.Client(profile=arguments.profile)[:]
except Exception, e:
  print str(e)
  raise Exception("A running IPython parallel cluster is required to run this script.")


def mix(a, b, amount):
  return ((1.0 - amount) * a) + (amount * b)


# Compute the model.
try:
  print("Examining and verifying data.")
  # find number of timeseries and accurate cluster sample count before starting model
  with h5py.File(os.path.join(arguments.directory, "inputs.hdf5"), "r") as file:
    array = hdf5.ArraySet(file)[0]
    dimensions = array.dimensions
    if len(dimensions) != 1:
      raise Exception("Inputs table must have exactly one dimension.")
    _numTimeseries = dimensions[0]["end"] - dimensions[0]["begin"]

  timeseries_samples = numpy.zeros(shape=(_numTimeseries))
  for timeseries_index in range(_numTimeseries):
    with h5py.File(os.path.join(arguments.directory, "timeseries-%s.hdf5" % timeseries_index), "r") as file:
      timeseries_samples[timeseries_index] = len(hdf5.ArraySet(file)[0].get_data(0)[:])

  # reduce the num of samples if fewer timeseries that curr cluster-sample-count
  if timeseries_samples.min() < _numSamples:
    _numSamples = timeseries_samples.min()
    print("Reducing cluster sample count to minimum found in data: %s", _numSamples)

  if arguments.cluster_sample_type in ["uniform-pla", "uniform-paa"]:
    print("Cluster sample count: %s.\n" % _numSamples)

  print("Storing clustering parameters.")

  # TODO
  # connection.put_model_parameter(mid, "cluster-bin-count", _numSamples)
  # connection.put_model_parameter(mid, "cluster-bin-type", arguments.cluster_sample_type)
  # connection.put_model_parameter(mid, "cluster-type", arguments.cluster_type)
  # connection.put_model_parameter(mid, "cluster-metric", arguments.cluster_metric)

  # connection.update_model(mid, message="Storing input table.")

  with h5py.File(os.path.join(arguments.directory, "inputs.hdf5"), "r") as file:
    array = hdf5.ArraySet(file)[0]
    dimensions = array.dimensions
    attributes = array.attributes
    if len(attributes) < 1:
      raise Exception("Inputs table must have at least one attribute.")
    if len(dimensions) != 1:
      raise Exception("Inputs table must have exactly one dimension.")
    timeseries_count = dimensions[0]["end"] - dimensions[0]["begin"]

    # TODO
    # connection.put_model_arrayset(mid, "inputs")
    # connection.put_model_arrayset_array(mid, "inputs", 0, dimensions, attributes)
    for attribute in range(len(attributes)):
      print("Storing input table attribute %s", attribute)
      data = array.get_data(attribute)[...]
      # connection.put_model_arrayset_data(mid, "inputs", "0/%s/..." % attribute, [data])

  # TODO
  # Create a mapping from unique cluster names to timeseries attributes.
  # connection.update_model(mid, state="running", started = datetime.datetime.utcnow().isoformat(), progress = 0.0, message="Mapping cluster names.")

  clusters = collections.defaultdict(list)
  timeseries_samples = numpy.zeros(shape=(timeseries_count))
  for timeseries_index in range(timeseries_count):
    with h5py.File(os.path.join(arguments.directory, "timeseries-%s.hdf5" % timeseries_index), "r") as file:
      attributes = hdf5.ArraySet(file)[0].attributes[1:] # Skip the timestamps
      timeseries_samples[timeseries_index] = len(hdf5.ArraySet(file)[0].get_data(0)[:])
    if len(attributes) < 1:
      raise Exception("A timeseries must have at least one attribute.")
    for attribute_index, attribute in enumerate(attributes):
      clusters[attribute["name"]].append((timeseries_index, attribute_index))

  # TODO
  # Store an alphabetized collection of cluster names.
  # connection.post_model_files(mid, ["clusters"], [json.dumps(sorted(clusters.keys()))], parser="slycat-blob-parser", parameters={"content-type": "application/json"})

  # Get the minimum and maximum times for every timeseries.
  def get_time_range(directory, timeseries_index):
    import h5py
    import os
    import hdf5
    with h5py.File(os.path.join(directory, "timeseries-%s.hdf5" % timeseries_index), "r+") as file: # We have to open the file with writing enabled in case the statistics cache gets updated.
      statistics = hdf5.ArraySet(file)[0].get_statistics(0)
    return statistics["min"], statistics["max"]

  # connection.update_model(mid, message="Collecting timeseries statistics.")
  print("Collecting timeseries statistics.")
  time_ranges = pool[:].map_sync(get_time_range, list(itertools.repeat(arguments.directory, timeseries_count)), range(timeseries_count))

  # For each cluster ...
  for index, (name, storage) in enumerate(sorted(clusters.items())):
    progress_begin = float(index) / float(len(clusters))
    progress_end = float(index + 1) / float(len(clusters))

    # Rebin each timeseries within the cluster so they share common stop/start times and samples.
    # connection.update_model(mid, message="Resampling data for %s" % name, progress=progress_begin)
    print("Resampling data for %s" % name)

    # Get the minimum and maximum times across every series in the cluster.
    ranges = [time_ranges[timeseries[0]] for timeseries in storage]
    time_min = min(zip(*ranges)[0])
    time_max = max(zip(*ranges)[1])

    if arguments.cluster_sample_type == "uniform-pla":
      def uniform_pla(directory, min_time, max_time, bin_count, timeseries_index, attribute_index):
        import h5py
        import numpy
        import os
        import hdf5

        bin_edges = numpy.linspace(min_time, max_time, bin_count + 1)
        bin_times = (bin_edges[:-1] + bin_edges[1:]) / 2
        with h5py.File(os.path.join(directory, "timeseries-%s.hdf5" % timeseries_index), "r") as file:
          original_times = hdf5.ArraySet(file)[0].get_data(0)[:]
          original_values = hdf5.ArraySet(file)[0].get_data(attribute_index + 1)[:]
        bin_values = numpy.interp(bin_times, original_times, original_values)
        return {
          "input-index" : timeseries_index,
          "times" : bin_times,
          "values" : bin_values,
        }
      directories = list(itertools.repeat(arguments.directory, len(storage)))
      min_times = list(itertools.repeat(time_min, len(storage)))
      max_times = list(itertools.repeat(time_max, len(storage)))
      bin_counts = list(itertools.repeat(_numSamples, len(storage)))
      timeseries_indices = [timeseries for timeseries, attribute in storage]
      attribute_indices = [attribute for timeseries, attribute in storage]
      waveforms = pool[:].map_sync(uniform_pla, directories, min_times, max_times, bin_counts, timeseries_indices, attribute_indices)
    elif arguments.cluster_sample_type == "uniform-paa":
      def uniform_paa(directory, min_time, max_time, bin_count, timeseries_index, attribute_index):
        import h5py
        import numpy
        import os
        import hdf5

        bin_edges = numpy.linspace(min_time, max_time, bin_count + 1)
        bin_times = (bin_edges[:-1] + bin_edges[1:]) / 2
        with h5py.File(os.path.join(directory, "timeseries-%s.hdf5" % timeseries_index), "r") as file:
          original_times = hdf5.ArraySet(file)[0].get_data(0)[:]
          original_values = hdf5.ArraySet(file)[0].get_data(attribute_index + 1)[:]
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
      directories = list(itertools.repeat(arguments.directory, len(storage)))
      min_times = list(itertools.repeat(time_min, len(storage)))
      max_times = list(itertools.repeat(time_max, len(storage)))
      bin_counts = list(itertools.repeat(_numSamples, len(storage)))
      timeseries_indices = [timeseries for timeseries, attribute in storage]
      attribute_indices = [attribute for timeseries, attribute in storage]
      waveforms = pool[:].map_sync(uniform_paa, directories, min_times, max_times, bin_counts, timeseries_indices, attribute_indices)

    # Compute a distance matrix comparing every series to every other ...
    observation_count = len(waveforms)
    distance_matrix = numpy.zeros(shape=(observation_count, observation_count))
    for i in range(0, observation_count):
      #connection.update_model(mid, message="Computing distance matrix for %s, %s of %s" % (name, i+1, observation_count), progress=mix(progress_begin, progress_end, float(i) / float(observation_count)))
      print("Computing distance matrix for %s, %s of %s" % (name, i+1, observation_count))
      for j in range(i + 1, observation_count):
        distance = numpy.sqrt(numpy.sum(numpy.power(waveforms[j]["values"] - waveforms[i]["values"], 2.0)))
        distance_matrix[i, j] = distance
        distance_matrix[j, i] = distance

    # Use the distance matrix to cluster observations ...
    # connection.update_model(mid, message="Clustering %s" % name)
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

    # connection.update_model(mid, message="Identifying examplars for %s" % (name))
    print("Identifying examplars for %s" % (name))
    for i in range(len(linkage)):
      cluster_id = i + observation_count
      (f_cluster1, f_cluster2, height, total_observations) = linkage[i]
      cluster1 = int(f_cluster1)
      cluster2 = int(f_cluster2)
      # Housekeeping: assemble the membership of the new cluster
      cluster_membership.append(cluster_membership[cluster1].union(cluster_membership[cluster2]))
      #cherrypy.log.error("Finding exemplar for cluster %s containing %s members from %s and %s." % (cluster_id, len(cluster_membership[-1]), cluster1, cluster2))

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
    # TODO
    # connection.post_model_files(mid, ["cluster-%s" % name], [json.dumps({
    #   "linkage":linkage.tolist(),
    #   "exemplars":exemplars,
    #   "input-indices":[waveform["input-index"] for waveform in waveforms],
    #   })], parser="slycat-blob-parser", parameters={"content-type":"application/json"})

    arrayset_name = "preview-%s" % name
    # connection.put_model_arrayset(mid, arrayset_name)
    for index, waveform in enumerate(waveforms):
      print("Uploading preview timeseries %s" % index)
      dimensions = [dict(name="sample", end=len(waveform["times"]))]
      attributes = [dict(name="time", type="float64"), dict(name="value", type="float64")]
      print("Creating array %s %s" % (attributes, dimensions))
      # connection.put_model_arrayset_array(mid, arrayset_name, index, dimensions, attributes)
      print("Uploading %s times, %s values" % (waveform["times"].shape, waveform["values"].shape))
      # connection.put_model_arrayset_data(mid, arrayset_name, "%s/0/...;%s/1/..." % (index, index), [waveform["times"], waveform["values"]])

  # connection.update_model(mid, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")
except:
  import traceback
  print(traceback.format_exc())
  # connection.update_model(mid, state="finished", result="failed", finished=datetime.datetime.utcnow().isoformat(), message=traceback.format_exc())
