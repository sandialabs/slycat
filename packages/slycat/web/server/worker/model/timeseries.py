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
    cluster_storage = collections.defaultdict(list)
    with slycat.web.server.database.hdf5.open(outputs["storage"]) as file:
      arrays = [(int(array_id), array, array.attrs) for array_id, array in file["array"].items()]
      for array_id, array, array_metadata in arrays:
        attributes = [int(attribute_id) for attribute_id in array["attribute"]]
        for attribute_id in attributes:
          if attribute_id != 0:
            cluster_storage[array_metadata["attribute-names"][attribute_id]].append((array_id, attribute_id))

    # Store an alphabetized collection of cluster names ...
    self.store_json_file_artifact("clusters", sorted(cluster_storage.keys()), input=False)

    # For each cluster (timeseries set) ...
    for index, (name, storage) in enumerate(cluster_storage):
      progress_begin = float(index) / float(len(cluster_storage))
      progress_end = float(index + 1) / float(len(cluster_storage))
      self.set_progress(progress_begin)

      self.set_message("Rebinning data for %s" % name)
#      # Rebin the timeseries within this cluster so they share common start / stop times and samples ...
#      time_min = self.scidb.query_value("aql", "select min(time) from %s" % artifact["columns"]).getDouble()
#      time_max = self.scidb.query_value("aql", "select max(time) from %s" % artifact["columns"]).getDouble()
#
#      if cluster_bin_type == "naive":
#        bin_size = (time_max - time_min) / cluster_bin_count
#        ids = numpy.array([], dtype=numpy.int64)
#        times = numpy.array([])
#        values = numpy.array([])
#        with self.scidb.query("afl", "redimension(apply(%s, bin, int64((time - %s) / %s)), <time:double null, value:double null>[bin=0:*,100000,0,timeseries=0:*,1,0], avg(time) as time, avg(c0) as value)" % (artifact["columns"], time_min, bin_size)) as result:
#          for chunk in result.chunks():
#            attributes = iter(chunk)
#            temp_ids = []
#            temp_times = []
#            for coordinates, value in attributes.next().coordinates_values():
#              temp_ids.append(coordinates[1])
#              temp_times.append(value.getDouble())
#            temp_values = [value.getDouble() for value in attributes.next()]
#
#            ids = numpy.concatenate((ids, numpy.array(temp_ids, dtype=numpy.int64)))
#            times = numpy.concatenate((times, numpy.array(temp_times)))
#            values = numpy.concatenate((values, numpy.array(temp_values)))
#      else:
#        raise Exception("Unknown cluster-bin-type: %s" % cluster_bin_type)

#      # Split our cluster members (which are mashed-together at the moment) into separate arrays ...
#      boundaries = range(cluster_bin_count, times.shape[0], cluster_bin_count)
#      ids = numpy.split(ids, boundaries)
#      times = numpy.split(times, boundaries)
#      values = numpy.split(values, boundaries)
#      cluster = [{"data-table-index":int(cluster_ids[0]), "times":cluster_times.tolist(), "values":cluster_values.tolist()} for cluster_ids, cluster_times, cluster_values in zip(ids, times, values)]
#
#      # Compute a distance matrix comparing every series to every other ...
#      observation_count = len(cluster)
#      distance_matrix = numpy.zeros(shape=(observation_count, observation_count))
#      for i in range(0, observation_count):
#        self.set_progress(self.mix(progress_begin, progress_end, float(i) / float(observation_count)))
#        self.set_message("Computing distance matrix for %s, %s of %s" % (name, i+1, observation_count))
#        for j in range(i + 1, observation_count):
#          distance = math.sqrt(math.fsum([math.pow(b - a, 2.0) for a, b in zip(cluster[i]["values"], cluster[j]["values"])]))
#          distance_matrix[i, j] = distance
#          distance_matrix[j, i] = distance
#
#      # Use the distance matrix to cluster observations ...
#      self.set_message("Clustering %s" % name)
#      distance = scipy.spatial.distance.squareform(distance_matrix)
#      linkage = scipy.cluster.hierarchy.linkage(distance, method=str(cluster_type))
#
#      # Identify exemplar waveforms for each cluster ...
#      summed_distances = numpy.zeros(shape=(observation_count))
#      exemplars = dict()
#      cluster_membership = []
#
#      for i in range(observation_count):
#        exemplars[i] = i
#        cluster_membership.append(set([i]))
#
#      for i in range(len(linkage)):
#        self.set_message("Identifying examplars for %s, %s of %s" % (name, i+1, len(linkage)))
#        cluster_id = i + observation_count
#        (f_cluster1, f_cluster2, height, total_observations) = linkage[i]
#        cluster1 = int(f_cluster1)
#        cluster2 = int(f_cluster2)
#        # Housekeeping: assemble the membership of the new cluster
#        cluster_membership.append(cluster_membership[cluster1].union(cluster_membership[cluster2]))
#        #cherrypy.log.error("Finding exemplar for cluster %s containing %s members from %s and %s." % (cluster_id, len(cluster_membership[-1]), cluster1, cluster2))
#
#        # We need to update the distance from each member of the new
#        # cluster to all the other members of the cluster.  That means
#        # that for all the members of cluster1, we need to add in the
#        # distances to members of cluster2, and for all members of
#        # cluster2, we need to add in the distances to members of
#        # cluster1.
#        for cluster1_member in cluster_membership[cluster1]:
#          for cluster2_member in cluster_membership[cluster2]:
#            summed_distances[cluster1_member] += distance_matrix[cluster1_member][cluster2_member]
#
#        for cluster2_member in cluster_membership[int(cluster2)]:
#          for cluster1_member in cluster_membership[cluster1]:
#            summed_distances[cluster2_member] += distance_matrix[cluster2_member][cluster1_member]
#
#        min_summed_distance = None
#        max_summed_distance = None
#
#        exemplar_id = 0
#        for member in cluster_membership[cluster_id]:
#            if min_summed_distance is None or summed_distances[member] < min_summed_distance:
#                min_summed_distance = summed_distances[member]
#                exemplar_id = member
#
#            if max_summed_distance is None or summed_distances[member] > min_summed_distance:
#                max_summed_distance = summed_distances[member]
#
#        #cherrypy.log.error("Best exemplar for cluster %s is leaf %s with total distance %s (max detected distance %s)." % (cluster_id, exemplar_id, min_summed_distance, max_summed_distance))
#
#        exemplars[cluster_id] = exemplar_id
#
#      # Store a data structure for clients ...
#      self.store_json_file_artifact("cluster-%s" % name, { "linkage" : linkage.tolist(), "waveforms" : cluster, "exemplars" : exemplars }, input=False)

    self.set_progress(1.0)
