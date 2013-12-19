from slycat.web.client import log
import collections
import datetime
import json
import numpy
import scipy.cluster.hierarchy
import scipy.spatial.distance
import slycat.array
import traceback

def mix(a, b, amount):
  return ((1.0 - amount) * a) + (amount * b)

class serial(object):
  """Template design pattern object for computing timeseries models in serial.

  Derive from this class and reimplement the required hook methods to compute
  a timeseries model using your own data.
  """
  def __init__(self, connection, mid, cluster_bin_type, cluster_bin_count, cluster_type):
    if cluster_bin_type not in ["naive"]:
      raise Exception("Unknown cluster bin type: %s" % cluster_bin_type)
    if cluster_bin_count < 1:
      raise Exception("Cluster bin count must be greater than zero.")

    self.connection = connection
    self.mid = mid
    self.cluster_bin_type = cluster_bin_type
    self.cluster_bin_count = cluster_bin_count
    self.cluster_type = cluster_type

  def compute(self):
    """Compute the timeseries model."""
    try:
      self.connection.update_model(self.mid, message="Storing input table.")
      log.info("Storing input table.")

      attributes, dimensions = self.get_input_metadata()
      attributes = slycat.array.require_attributes(attributes)
      dimensions = slycat.array.require_dimensions(dimensions)
      if len(attributes) < 1:
        raise Exception("Inputs table must have at least one attribute.")
      if len(dimensions) != 1:
        raise Exception("Inputs table must have exactly one dimension.")
      timeseries_count = dimensions[0]["end"] - dimensions[0]["begin"]

      self.connection.start_array_set(self.mid, "inputs")
      self.connection.start_array(self.mid, "inputs", 0, attributes, dimensions)
      for attribute in range(len(attributes)):
        self.connection.store_array_attribute(self.mid, "inputs", 0, attribute, self.get_input_attribute(attribute))

      # Store clustering parameters.
      self.connection.update_model(self.mid, message="Storing clustering parameters.")
      log.info("Storing clustering parameters.")

      self.connection.store_parameter(self.mid, "cluster-bin-count", self.cluster_bin_count)
      self.connection.store_parameter(self.mid, "cluster-bin-type", self.cluster_bin_type)
      self.connection.store_parameter(self.mid, "cluster-type", self.cluster_type)

      # Create a mapping from unique cluster names to timeseries attributes.
      self.connection.update_model(self.mid, state="running", started = datetime.datetime.utcnow().isoformat(), progress = 0.0, message="Mapping cluster names.")

      clusters = collections.defaultdict(list)
      for timeseries_index in range(timeseries_count):
        attributes = slycat.array.require_attributes(self.get_timeseries_attributes(timeseries_index))
        if len(attributes) < 1:
          raise Exception("A timeseries must have at least one attribute.")
        for attribute_index, attribute in enumerate(attributes):
          clusters[attribute["name"]].append((timeseries_index, attribute_index))

      # Store an alphabetized collection of cluster names.
      self.connection.store_file(self.mid, "clusters", json.dumps(sorted(clusters.keys())), "application/json")

      # Get the minimum and maximum times for every timeseries.
      time_ranges = []
      for timeseries_index in range(timeseries_count):
        self.connection.update_model(self.mid, message="Collecting statistics for timeseries %s" % timeseries_index)
        log.info("Collecting statistics for timeseries %s" % timeseries_index)
        time_ranges.append(self.get_timeseries_time_range(timeseries_index))

      # For each cluster ...
      for index, (name, storage) in enumerate(sorted(clusters.items())):
        progress_begin = float(index) / float(len(clusters))
        progress_end = float(index + 1) / float(len(clusters))
        # Rebin each timeseries within the cluster so they share common stop/start times and samples.
        self.connection.update_model(self.mid, message="Rebinning data for %s" % name, progress=progress_begin)
        log.info("Rebinning data for %s" % name)

        # Get the minimum and maximum times across every series in the cluster.
        ranges = [time_ranges[timeseries[0]] for timeseries in storage]
        time_min = min(zip(*ranges)[0])
        time_max = max(zip(*ranges)[1])

        waveforms = []
        if self.cluster_bin_type == "naive":
          bin_edges = numpy.linspace(time_min, time_max, self.cluster_bin_count + 1)
          bin_times = (bin_edges[:-1] + bin_edges[1:]) / 2
          for timeseries_index, attribute_index in storage:
            original_times = self.get_timeseries_times(timeseries_index)
            original_values = self.get_timeseries_attribute(timeseries_index, attribute_index)
            bin_indices = numpy.digitize(original_times, bin_edges)
            bin_indices[-1] -= 1
            bin_counts = numpy.bincount(bin_indices)[1:]
            bin_sums = numpy.bincount(bin_indices, original_values)[1:]
            bin_values = bin_sums / bin_counts
            waveforms.append({
              "input-index" : timeseries_index,
              "times" : bin_times,
              "values" : bin_values
            })

        # Compute a distance matrix comparing every series to every other ...
        observation_count = len(waveforms)
        distance_matrix = numpy.zeros(shape=(observation_count, observation_count))
        for i in range(0, observation_count):
          self.connection.update_model(self.mid, message="Computing distance matrix for %s, %s of %s" % (name, i+1, observation_count), progress=mix(progress_begin, progress_end, float(i) / float(observation_count)))
          log.info("Computing distance matrix for %s, %s of %s" % (name, i+1, observation_count))
          for j in range(i + 1, observation_count):
            distance = numpy.sqrt(numpy.sum(numpy.power(waveforms[j]["values"] - waveforms[i]["values"], 2.0)))
            distance_matrix[i, j] = distance
            distance_matrix[j, i] = distance

        # Use the distance matrix to cluster observations ...
        self.connection.update_model(self.mid, message="Clustering %s" % name)
        log.info("Clustering %s" % name)
        distance = scipy.spatial.distance.squareform(distance_matrix)
        linkage = scipy.cluster.hierarchy.linkage(distance, method=str(self.cluster_type))

        # Identify exemplar waveforms for each cluster ...
        summed_distances = numpy.zeros(shape=(observation_count))
        exemplars = dict()
        cluster_membership = []

        for i in range(observation_count):
          exemplars[i] = i
          cluster_membership.append(set([i]))

        for i in range(len(linkage)):
          self.connection.update_model(self.mid, message="Identifying examplars for %s, %s of %s" % (name, i+1, len(linkage)))
          log.info("Identifying examplars for %s, %s of %s" % (name, i+1, len(linkage)))
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
        self.connection.store_file(self.mid, "cluster-%s" % name, json.dumps({"linkage":linkage.tolist(), "waveforms":[{"input-index":waveform["input-index"], "times":waveform["times"].tolist(), "values":waveform["values"].tolist()} for waveform in waveforms], "exemplars":exemplars}), "application/json")

      self.connection.update_model(self.mid, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")
    except:
      self.connection.update_model(self.mid, state="finished", result="failed", finished=datetime.datetime.utcnow().isoformat(), message=traceback.format_exc())
      log.error(traceback.format_exc())

  def get_input_metadata(self):
    """Return (attributes, dimensions) for the model's input table."""
    raise NotImplementedError("You must implement get_input_metadata().")

  def get_input_attribute(self, attribute):
    """Return an attribute for the model's input table."""
    raise NotImplementedError("You must implement get_input_attribute().")

  def get_timeseries_attributes(self, index):
    """Return the attributes for timeseries N (the timestamps should *not* be included in the attributes)."""
    raise NotImplementedError("You must implement get_timeseries_attributes().")

  def get_timeseries_time_range(self, index):
    """Return the minimum and maximum time for timeseries N."""
    raise NotImplementedError("You must implement get_timeseries_time_range().")

  def get_timeseries_times(self, index):
    """Return the timestamps for timeseries N."""
    raise NotImplementedError("You must implement get_timeseries_times().")

  def get_timeseries_attribute(self, index, attribute):
    """Return an attribute for timeseries N (the timestamps should *not* be included in the attributes)."""
    raise NotImplementedError("You must implement get_timeseries_attribute().")

