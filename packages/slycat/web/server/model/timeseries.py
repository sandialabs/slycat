# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

from slycat.web.server.model import *

import cherrypy
import collections
import datetime
import math
import numpy
import scipy.cluster.hierarchy
import scipy.spatial.distance
import slycat.web.server.database.couchdb
import slycat.web.server.database.hdf5
import threading
import traceback

def compute(mid):
  try:
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)

    # Get required inputs ...
    inputs = load_hdf5_artifact(model, "inputs")
    outputs = load_hdf5_artifact(model, "outputs")
    cluster_type = load_json_artifact(model, "cluster-type")
    cluster_bin_count = load_json_artifact(model, "cluster-bin-count")
    cluster_bin_type = load_json_artifact(model, "cluster-bin-type")

    # Create a mapping from unique output variable names to array attributes ...
    name_storage = collections.defaultdict(list)
    with slycat.web.server.database.hdf5.open(outputs) as file:
      arrays = [(int(array_id), array, array.attrs) for array_id, array in file["array"].items()]
      for array_id, array, array_metadata in arrays:
        attributes = [int(attribute_id) for attribute_id in array["attribute"]]
        for attribute_id in attributes:
          if attribute_id != 0:
            name_storage[array_metadata["attribute-names"][attribute_id]].append((array_id, attribute_id))

      # Store an alphabetized collection of cluster names ...
      model = store_json_file_artifact(database, model, "clusters", sorted(name_storage.keys()))

      # For each cluster (timeseries set) ...
      for index, (name, storage) in enumerate(name_storage.items()):
        progress_begin = float(index) / float(len(name_storage))
        progress_end = float(index + 1) / float(len(name_storage))
        update(database, model, progress=progress_begin)

        # Get the minimum and maximum times across every series in the cluster
        update(database, model, message="Collecting statistics for %s" % name)
        min_times = [file.array_attribute(array_index, 0).attrs["min"] for array_index, attribute_index in storage]
        max_times = [file.array_attribute(array_index, 0).attrs["max"] for array_index, attribute_index in storage]
        time_min = min(min_times)
        time_max = max(max_times)

        # Rebin the timeseries within this cluster so they share common start / stop times and samples ...
        update(database, model, message="Rebinning data for %s" % name)

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
          update(database, model, progress=mix(progress_begin, progress_end, float(i) / float(observation_count)))
          update(database, model, message="Computing distance matrix for %s, %s of %s" % (name, i+1, observation_count))
          for j in range(i + 1, observation_count):
            distance = math.sqrt(math.fsum([math.pow(b - a, 2.0) for a, b in zip(waveforms[i]["values"], waveforms[j]["values"])]))
            distance_matrix[i, j] = distance
            distance_matrix[j, i] = distance

        # Use the distance matrix to cluster observations ...
        update(database, model, message="Clustering %s" % name)
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
          update(database, model, message="Identifying examplars for %s, %s of %s" % (name, i+1, len(linkage)))
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
        model = store_json_file_artifact(database, model, "cluster-%s" % name, {"linkage":linkage.tolist(), "waveforms":waveforms, "exemplars":exemplars})

    update(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

  except:
    cherrypy.log.error("%s" % traceback.format_exc())

    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    update(database, model, state="finished", result="failed", finished=datetime.datetime.utcnow().isoformat(), message=traceback.format_exc())

def finish(database, model):
  """Compute a timeseries model."""
  thread = threading.Thread(name="Compute Timeseries Model", target=compute, kwargs={"mid" : model["_id"]})
  thread.start()

