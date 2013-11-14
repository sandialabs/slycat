# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import collections
import slycat.web.server.worker.model
import slycat.web.server.database.hdf5

class implementation(slycat.web.server.worker.model.prototype):
  """Worker that computes a timeseries model, given an input table, a
  collection of timeseries, and a clustering type."""
  def __init__(self, security, pid, mid, name, marking, description):
    slycat.web.server.worker.model.prototype.__init__(self, security, "Timeseries model", pid, mid, "timeseries", name, marking, description, incremental=True)

  def compute_model(self):
    import math
    import numpy
    import re
    import scipy.cluster.hierarchy
    import scipy.spatial.distance

    self.set_progress(0.0)

    # Get required inputs ...
    inputs = self.load_hdf5_artifact("inputs")
    outputs = self.load_hdf5_artifact("outputs")
    cluster_type = self.load_json_artifact("cluster-type")
    cluster_bin_count = self.load_json_artifact("cluster-bin-count")
    cluster_bin_type = self.load_json_artifact("cluster-bin-type")

    # Create a mapping from unique output variable names to array attributes ...
    name_storage = collections.defaultdict(list)
    with slycat.web.server.database.hdf5.open(outputs["storage"]) as file:
      arrays = [(int(array_id), array, array.attrs) for array_id, array in file["array"].items()]
      for array_id, array, array_metadata in arrays:
        attributes = [int(attribute_id) for attribute_id in array["attribute"]]
        for attribute_id in attributes:
          if attribute_id != 0:
            name_storage[array_metadata["attribute-names"][attribute_id]].append((array_id, attribute_id))

      # Store an alphabetized collection of cluster names ...
      self.store_json_file_artifact("clusters", sorted(name_storage.keys()), input=False)

      # For each cluster (timeseries set) ...
      for index, (name, storage) in enumerate(name_storage.items()):
        progress_begin = float(index) / float(len(name_storage))
        progress_end = float(index + 1) / float(len(name_storage))
        self.set_progress(progress_begin)

        # Get the minimum and maximum times across every series in the cluster
        self.set_message("Collecting statistics for %s" % name)
        min_times = [file.array_attribute(array_index, 0).attrs["min"] for array_index, attribute_index in storage]
        max_times = [file.array_attribute(array_index, 0).attrs["max"] for array_index, attribute_index in storage]
        time_min = min(min_times)
        time_max = max(max_times)

        # Rebin the timeseries within this cluster so they share common start / stop times and samples ...
        self.set_message("Rebinning data for %s" % name)

        waveforms = []

        if cluster_bin_type == "naive":
          bin_edges = numpy.linspace(time_min, time_max, cluster_bin_count + 1)
          bin_times = (bin_edges[:-1] + bin_edges[1:]) / 2
          for array_index, attribute_index in storage:
            original_times = file.array_attribute(array_index, 0)[...]
            original_values = file.array_attribute(array_index, attribute_index)[...]
            bin_indices = numpy.digitize(original_times, bin_edges)
            bin_indices[-1] -= 1
            bin_counts = numpy.bincount(bin_indices)[1:]
            bin_sums = numpy.bincount(bin_indices, original_values)[1:]
            bin_values = bin_sums / bin_counts
            waveforms.append({
              "input-index" : array_index,
              "times" : bin_times.tolist(),
              "values" : bin_values.tolist()
            })
        else:
          raise Exception("Unknown cluster-bin-type: %s" % cluster_bin_type)

        # Compute a distance matrix comparing every series to every other ...
        observation_count = len(waveforms)
        distance_matrix = numpy.zeros(shape=(observation_count, observation_count))
        for i in range(0, observation_count):
          self.set_progress(self.mix(progress_begin, progress_end, float(i) / float(observation_count)))
          self.set_message("Computing distance matrix for %s, %s of %s" % (name, i+1, observation_count))
          for j in range(i + 1, observation_count):
            distance = math.sqrt(math.fsum([math.pow(b - a, 2.0) for a, b in zip(waveforms[i]["values"], waveforms[j]["values"])]))
            distance_matrix[i, j] = distance
            distance_matrix[j, i] = distance

        # Use the distance matrix to cluster observations ...
        self.set_message("Clustering %s" % name)
        distance = scipy.spatial.distance.squareform(distance_matrix)
        linkage = scipy.cluster.hierarchy.linkage(distance, method=str(cluster_type))

        # Identify exemplar waveforms for each cluster ...
        summed_distances = numpy.zeros(shape=(observation_count))
        exemplars = dict()
        cluster_membership = []

        for i in range(observation_count):
          exemplars[i] = i
          cluster_membership.append(set([i]))

        for i in range(len(linkage)):
          self.set_message("Identifying examplars for %s, %s of %s" % (name, i+1, len(linkage)))
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

          #cherrypy.log.error("Best exemplar for cluster %s is leaf %s with total distance %s (max detected distance %s)." % (cluster_id, exemplar_id, min_summed_distance, max_summed_distance))

          exemplars[cluster_id] = exemplar_id

        # Store a data structure for clients ...
        self.store_json_file_artifact("cluster-%s" % name, {"linkage":linkage.tolist(), "waveforms":waveforms, "exemplars":exemplars}, input=False)

    self.set_progress(1.0)
