from slycat.web.client import log
import collections
import datetime
import json
import numpy
import scipy.cluster.hierarchy
import scipy.spatial.distance
import slycat.data.array
import traceback

def mix(a, b, amount):
  return ((1.0 - amount) * a) + (amount * b)

class input_strategy(object):
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

class storage_strategy(object):
  def update_model(self, state=None, result=None, started=None, finished=None, progress=None, message=None):
    raise NotImplementedError("You must implement update_model().")
  def store_parameter(self, name, value):
    raise NotImplementedError("You must implement store_parameter().")
  def start_array_set(self, name):
    raise NotImplementedError("You must implement start_array_set().")
  def start_array(self, name, array_index, attributes, dimensions):
    raise NotImplementedError("You must implement start_array().")
  def store_array_attribute(self, name, array_index, attribute_index, data):
    raise NotImplementedError("You must implement store_array_attribute().")
  def store_file(self, name, data, content_type):
    raise NotImplementedError("You must implement store_file().")

class client_storage_strategy(storage_strategy):
  def __init__(self, connection, mid):
    self.connection = connection
    self.mid = mid
  def update_model(self, state=None, result=None, started=None, finished=None, progress=None, message=None):
    self.connection.update_model(self.mid, state=state, result=result, started=started, finished=finished, progress=progress, message=message)
  def store_parameter(self, name, value):
    self.connection.store_parameter(self.mid, name, value)
  def start_array_set(self, name):
    self.connection.start_array_set(self.mid, name)
  def start_array(self, name, array_index, attributes, dimensions):
    self.connection.start_array(self.mid, name, array_index, attributes, dimensions)
  def store_array_attribute(self, name, array_index, attribute_index, data):
    self.connection.store_array_attribute(self.mid, name, array_index, attribute_index, data)
  def store_file(self, name, data, content_type):
    self.connection.store_file(self.mid, name, data, content_type)

def serial(input_strategy, storage_strategy, cluster_bin_type, cluster_bin_count, cluster_type):
  """Compute a timeseries model in serial."""
  if cluster_bin_type not in ["naive"]:
    raise Exception("Unknown cluster bin type: %s" % cluster_bin_type)
  if cluster_bin_count < 1:
    raise Exception("Cluster bin count must be greater than zero.")

  try:
    storage_strategy.update_model(message="Storing input table.")
    log.info("Storing input table.")

    attributes, dimensions = input_strategy.get_input_metadata()
    attributes = slycat.data.array.require_attributes(attributes)
    dimensions = slycat.data.array.require_dimensions(dimensions)
    if len(attributes) < 1:
      raise Exception("Inputs table must have at least one attribute.")
    if len(dimensions) != 1:
      raise Exception("Inputs table must have exactly one dimension.")
    timeseries_count = dimensions[0]["end"] - dimensions[0]["begin"]

    storage_strategy.start_array_set("inputs")
    storage_strategy.start_array("inputs", 0, attributes, dimensions)
    for attribute in range(len(attributes)):
      storage_strategy.store_array_attribute("inputs", 0, attribute, input_strategy.get_input_attribute(attribute))

    # Store clustering parameters.
    storage_strategy.update_model(message="Storing clustering parameters.")
    log.info("Storing clustering parameters.")

    storage_strategy.store_parameter("cluster-bin-count", cluster_bin_count)
    storage_strategy.store_parameter("cluster-bin-type", cluster_bin_type)
    storage_strategy.store_parameter("cluster-type", cluster_type)

    # Create a mapping from unique cluster names to timeseries attributes.
    storage_strategy.update_model(state="running", started = datetime.datetime.utcnow().isoformat(), progress = 0.0, message="Mapping cluster names.")

    clusters = collections.defaultdict(list)
    for timeseries_index in range(timeseries_count):
      attributes = slycat.data.array.require_attributes(input_strategy.get_timeseries_attributes(timeseries_index))
      if len(attributes) < 1:
        raise Exception("A timeseries must have at least one attribute.")
      for attribute_index, attribute in enumerate(attributes):
        clusters[attribute["name"]].append((timeseries_index, attribute_index))

    # Store an alphabetized collection of cluster names.
    storage_strategy.store_file("clusters", json.dumps(sorted(clusters.keys())), "application/json")

    # Get the minimum and maximum times for every timeseries.
    time_ranges = []
    for timeseries_index in range(timeseries_count):
      storage_strategy.update_model(message="Collecting statistics for timeseries %s" % timeseries_index)
      log.info("Collecting statistics for timeseries %s" % timeseries_index)
      time_ranges.append(input_strategy.get_timeseries_time_range(timeseries_index))

    # For each cluster ...
    for index, (name, storage) in enumerate(sorted(clusters.items())):
      progress_begin = float(index) / float(len(clusters))
      progress_end = float(index + 1) / float(len(clusters))
      # Rebin each timeseries within the cluster so they share common stop/start times and samples.
      storage_strategy.update_model(message="Rebinning data for %s" % name, progress=progress_begin)
      log.info("Rebinning data for %s" % name)

      # Get the minimum and maximum times across every series in the cluster.
      ranges = [time_ranges[timeseries[0]] for timeseries in storage]
      time_min = min(zip(*ranges)[0])
      time_max = max(zip(*ranges)[1])

      waveforms = []
      if cluster_bin_type == "naive":
        bin_edges = numpy.linspace(time_min, time_max, cluster_bin_count + 1)
        bin_times = (bin_edges[:-1] + bin_edges[1:]) / 2
        for timeseries_index, attribute_index in storage:
          original_times = input_strategy.get_timeseries_times(timeseries_index)
          original_values = input_strategy.get_timeseries_attribute(timeseries_index, attribute_index)
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
        storage_strategy.update_model(message="Computing distance matrix for %s, %s of %s" % (name, i+1, observation_count), progress=mix(progress_begin, progress_end, float(i) / float(observation_count)))
        log.info("Computing distance matrix for %s, %s of %s" % (name, i+1, observation_count))
        for j in range(i + 1, observation_count):
          distance = numpy.sqrt(numpy.sum(numpy.power(waveforms[j]["values"] - waveforms[i]["values"], 2.0)))
          distance_matrix[i, j] = distance
          distance_matrix[j, i] = distance

      # Use the distance matrix to cluster observations ...
      storage_strategy.update_model(message="Clustering %s" % name)
      log.info("Clustering %s" % name)
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
        storage_strategy.update_model(message="Identifying examplars for %s, %s of %s" % (name, i+1, len(linkage)))
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
      storage_strategy.store_file("cluster-%s" % name, json.dumps({"linkage":linkage.tolist(), "waveforms":[{"input-index":waveform["input-index"], "times":waveform["times"].tolist(), "values":waveform["values"].tolist()} for waveform in waveforms], "exemplars":exemplars}), "application/json")

    storage_strategy.update_model(state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")
  except:
    log.error(traceback.format_exc())
    storage_strategy.update_model(state="finished", result="failed", finished=datetime.datetime.utcnow().isoformat(), message=traceback.format_exc())

