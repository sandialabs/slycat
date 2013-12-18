from slycat.web.client import log
import collections
import numpy
import scipy.cluster.hierarchy
import scipy.spatial.distance

class serial(object):
  """Template design pattern object for computing timeseries models in serial.

  Derive from this class and reimplement the required hook methods to compute
  a timeseries model using your own data.
  """
  def compute(self, cluster_bin_type, cluster_bin_count, cluster_type):
    """Compute the timeseries model."""
    if cluster_bin_type not in ["naive"]:
      self.raise_exception(Exception("Unknown cluster bin type: %s" % cluster_bin_type))
    if cluster_bin_count < 1:
      self.raise_exception(Exception("Cluster bin count must be greater than zero."))

    timeseries_count = self.get_timeseries_count()
    self.log_info("Computing timeseries model with {} series".format(timeseries_count))

    # Create a mapping from unique cluster names to timeseries attributes.
    clusters = collections.defaultdict(list)
    for timeseries_index in range(timeseries_count):
      attributes = self.get_timeseries_attributes(timeseries_index)
      if len(attributes) < 1:
        self.raise_exception(Exception("A timeseries must have at least one attribute."))
      for attribute_index, (attribute_name, attribute_type) in enumerate(attributes):
        clusters[attribute_name].append((timeseries_index, attribute_index))

    # Store an alphabetized collection of cluster names.
    self.store_cluster_names(sorted(clusters.keys()))

    # Get the minimum and maximum times for every timeseries.
    time_ranges = []
    for timeseries_index in range(timeseries_count):
      self.log_info("Collecting statistics for timeseries %s" % timeseries_index)
      time_ranges.append(self.get_timeseries_time_range(timeseries_index))
      self.log_debug("min(time): %s max(time): %s" % (time_ranges[-1][0], time_ranges[-1][1]))

    # For each cluster ...
    for index, (name, storage) in enumerate(sorted(clusters.items())):
      # Rebin each timeseries within the cluster so they share common stop/start times and samples.
      self.log_info("Rebinning data for %s" % name)

      # Get the minimum and maximum times across every series in the cluster.
      ranges = [time_ranges[timeseries[0]] for timeseries in storage]
      time_min = min(zip(*ranges)[0])
      time_max = max(zip(*ranges)[1])
      self.log_debug("min(time): %s max(time): %s" % (time_min, time_max))

      waveforms = []
      if cluster_bin_type == "naive":
        bin_edges = numpy.linspace(time_min, time_max, cluster_bin_count + 1)
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
        self.log_info("Computing distance matrix for %s, %s of %s" % (name, i+1, observation_count))
        #update(database, model, progress=mix(progress_begin, progress_end, float(i) / float(observation_count)))
        #update(database, model, message="Computing distance matrix for %s, %s of %s" % (name, i+1, observation_count))
        for j in range(i + 1, observation_count):
          distance = numpy.sqrt(numpy.sum(numpy.power(waveforms[j]["values"] - waveforms[i]["values"], 2.0)))
          distance_matrix[i, j] = distance
          distance_matrix[j, i] = distance

      # Use the distance matrix to cluster observations ...
      self.log_info("Clustering %s" % name)
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
        self.log_info("Identifying examplars for %s, %s of %s" % (name, i+1, len(linkage)))
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

      # Store the cluster
      self.store_cluster(name, {"linkage":linkage, "waveforms":waveforms, "exemplars":exemplars})

  def log_info(self, message):
    """Log an informational message using the client library logger.

    Reimplement this method in derived classes to substitute a different
    logging mechanism.
    """
    log.info(message)

  def log_debug(self, message):
    """Log a debug message using the client library logger.

    Reimplement this method in derived classes to substitute a different
    logging mechanism.
    """
    log.debug(message)

  def raise_exception(self, exception):
    """Raise an exception.

    Reimplement this method in derived classes to customize the exception type.
    """
    raise exception

  def get_timeseries_count(self):
    """Return the number of timeseries to be included in the model."""
    self.raise_exception(NotImplementedError("You must implement get_timeseries_count()."))

  def get_timeseries_attributes(self, index):
    """Return the attributes for timeseries N (the timestamps should *not* be included in the attributes)."""
    self.raise_exception(NotImplementedError("You must implement get_timeseries_attributes()."))

  def get_timeseries_time_range(self, index):
    """Return the minimum and maximum time for timeseries N."""
    self.raise_exception(NotImplementedError("You must implement get_timeseries_time_range()."))

  def get_timeseries_times(self, index):
    """Return the timestamps for timeseries N."""
    self.raise_exception(NotImplementedError("You must implement get_timeseries_times()."))

  def get_timeseries_attribute(self, index, attribute):
    """Return an attribute for timeseries N (the timestamps should *not* be included in the attributes)."""
    self.raise_exception(NotImplementedError("You must implement get_timeseries_attribute()."))

  def store_cluster_names(self, names):
    """Store the alphabetized list of unique cluster names."""
    pass

  def store_cluster(self, name, cluster):
    """Store a named cluster."""
    pass
