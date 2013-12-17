from slycat.web.client import log
import collections
import numpy

class serial(object):
  """Template design pattern object for computing timeseries models in serial.

  Derive from this class and reimplement the required hook methods to compute
  a timeseries model using your own data.
  """
  def compute(self, cluster_bin_type, cluster_bin_count):
    """Compute the timeseries model."""
    if cluster_bin_type not in ["naive"]:
      self.raise_exception(Exception("Unknown cluster bin type: %s" % cluster_bin_type))
    if cluster_bin_count < 1:
      self.raise_exception(Exception("Cluster bin count must be greater than zero."))

    timeseries_count = self.get_timeseries_count()
    self.log_info("Computing timeseries model with {} series".format(timeseries_count))

    # Create a mapping from unique cluster names to timeseries attributes.
    name_storage = collections.defaultdict(list)
    for timeseries_index in range(timeseries_count):
      attributes = self.get_timeseries_attributes(timeseries_index)
      if len(attributes) < 2:
        self.raise_exception(Exception("A timeseries must have at least two attributes."))
      for attribute_index, (attribute_name, attribute_type) in enumerate(attributes):
        name_storage[attribute_name].append((timeseries_index, attribute_index))

    # Store an alphabetized collection of cluster names.
    self.store_cluster_names(sorted(name_storage.keys()))

    # For each cluster ...
    for index, (name, storage) in enumerate(sorted(name_storage.items())):
      # Get the minimum and maximum times across every series in the cluster.
      progress_begin = float(index) / float(len(name_storage))
      progress_end = float(index + 1) / float(len(name_storage))
      self.update(progress=progress_begin, message="Collecting statistics for %s" % name)

      ranges = [self.get_timeseries_time_range(timeseries[0]) for timeseries in storage]
      time_min = min(zip(*ranges)[0])
      time_max = max(zip(*ranges)[1])

      # Rebin each timeseries within the cluster so they share common stop/start times and samples.
      self.update(message="Rebinning data for %s" % name)

      waveforms = []
      if cluster_bin_type == "naive":
        bin_edges = numpy.linspace(time_min, time_max, cluster_bin_count + 1)
        bin_times = (bin_edges[:-1] + bin_edges[1:]) / 2
        for timeseries_index, attribute_index in storage:
          original_times = self.get_timeseries_attribute(timeseries_index, 0)
          original_values = self.get_timeseries_attribute(timeseries_index, attribute_index)
          bin_indices = numpy.digitize(original_times, bin_edges)
          bin_indices[-1] -= 1
          bin_counts = numpy.bincount(bin_indices)[1:]
          bin_sums = numpy.bincount(bin_indices, original_values)[1:]
          bin_values = bin_sums / bin_counts
          waveforms.append({
            "input-index" : timeseries_index,
            "times" : bin_times.tolist(),
            "values" : bin_values.tolist()
          })

  def log_info(self, message):
    """Log an informational message using the client library logger.

    Reimplement this method in derived classes to substitute a different
    logging mechanism.
    """
    log.info(message)

  def raise_exception(self, exception):
    """Raise an exception.

    Reimplement this method in derived classes to customize the exception type.
    """
    raise exception

  def get_timeseries_count(self):
    """Return the number of timeseries to be included in the model."""
    self.raise_exception(NotImplementedError("You must implement get_timeseries_count()."))

  def get_timeseries_attributes(self, index):
    """Return the attributes for timeseries N."""
    self.raise_exception(NotImplementedError("You must implement get_timeseries_attributes()."))

  def get_timeseries_time_range(self, index):
    """Return the minimum and maximum time for timeseries N."""
    self.raise_exception(NotImplementedError("You must implement get_timeseries_time_range()."))

  def get_timeseries_attribute(self, index, attribute):
    """Return an attribute for timeseries N.  Attribute 0 must be the timestamps."""
    self.raise_exception(NotImplementedError("You must implement get_timeseries_attribute()."))

  def store_cluster_names(self, names):
    """Store the alphabetized list of unique cluster names."""
    pass

  def update(self, progress=None, message=None):
    """Display progress."""
    if message is not None:
      self.log_info(message)
