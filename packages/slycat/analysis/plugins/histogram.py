# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def register_client_plugin(context):
  import slycat.analysis.client

  def histogram(connection, source, bins=10):
    """Return an array containing one-or-more histograms from a source array.
    """
    source = slycat.analysis.client.require_array(source)
    if isinstance(bins, int):
      if bins < 1:
        raise slycat.analysis.client.InvalidArgument("At least one bin is required.")
    elif isinstance(bins, list):
      if len(bins) < 2:
        raise slycat.analysis.client.InvalidArgument("At least two bin edges are required.")
    return connection.create_remote_array("histogram", [source], bins)
  context.register_plugin_function("histogram", histogram)

def register_worker_plugin(context):
  import numpy
  import Pyro4

  import slycat.analysis.worker
  import slycat.analysis.worker.accumulator

  def histogram(factory, worker_index, source, bins):
    return factory.pyro_register(histogram_array(worker_index, factory.require_object(source), bins))

  class histogram_array(slycat.analysis.worker.array):
    def __init__(self, worker_index, source, bins):
      slycat.analysis.worker.array.__init__(self, worker_index)
      self.source = source
      self.bins = bins
      self.bin_count = bins if isinstance(bins, int) else len(bins) - 1
    def dimensions(self):
      return [{"name":"bin", "type":"int64", "begin":0, "end":self.bin_count, "chunk-size":self.bin_count}]
    def attributes(self):
      return [{"name":"hist_%s" % (attribute["name"]), "type":attribute["type"]} for attribute in self.source.attributes()]
    def iterator(self):
      if self.worker_index == 0:
        return self.pyro_register(histogram_array_iterator(self))
      else:
        return self.pyro_register(slycat.analysis.worker.null_array_iterator(self))

    def calculate_local_minimaxes(self):
      source_attributes = self.source.attributes()
      minimaxes = [(slycat.analysis.worker.accumulator.minimum(), slycat.analysis.worker.accumulator.maximum()) for source_attribute in source_attributes]
      with self.source.iterator() as source_iterator:
        for ignored in source_iterator:
          for index, (minimum, maximum) in enumerate(minimaxes):
            observations = source_iterator.values(index)
            minimum.accumulate(observations)
            maximum.accumulate(observations)
      return minimaxes

    def calculate_global_bins_list(self):
      """Return a list containing a sequence of bin edges for each attribute in the source array."""
      if not isinstance(self.bins, int):
        return [self.bins for attribute in self.source.attributes()]

      minimaxes = [Pyro4.async(sibling).calculate_local_minimaxes() for sibling in self.siblings]
      minimaxes = [minimax.value for minimax in minimaxes]
      minimaxes = zip(*minimaxes)
      global_minimaxes = [(slycat.analysis.worker.accumulator.minimum(), slycat.analysis.worker.accumulator.maximum()) for minimax in minimaxes]
      for (global_minimum, global_maximum), remote_minimaxes in zip(global_minimaxes, minimaxes):
        for remote_minimum, remote_maximum in remote_minimaxes:
          global_minimum.reduce(remote_minimum)
          global_maximum.reduce(remote_maximum)

      bins_list = []
      for global_minimum, global_maximum in global_minimaxes:
        if isinstance(global_minimum.result(), basestring):
          bins_list.append(numpy.linspace(0, 1, self.bins + 1))
        else:
          bins_list.append(numpy.linspace(global_minimum.result(), global_maximum.result(), self.bins + 1))
      return bins_list

    def calculate_local_histograms(self, bins_list):
      slycat.analysis.worker.log.debug("calculate_local_histograms: %s", bins_list)
      histograms = [slycat.analysis.worker.accumulator.histogram(bins) for bins in bins_list]
      with self.source.iterator() as source_iterator:
        for ignored in source_iterator:
          for index, histogram in enumerate(histograms):
            histogram.accumulate(source_iterator.values(index))
      slycat.analysis.worker.log.debug("histograms: %s", histograms)
      return histograms

    def calculate_global_histograms(self):
      bins_list = self.calculate_global_bins_list()

      histograms = [Pyro4.async(sibling).calculate_local_histograms(bins_list) for sibling in self.siblings]
      histograms = [histogram.value for histogram in histograms]
      histograms = zip(*histograms)
      global_histograms = [slycat.analysis.worker.accumulator.histogram(bins) for bins in bins_list]
      for global_histogram, remote_histograms in zip(global_histograms, histograms):
        for remote_histogram in remote_histograms:
          global_histogram.reduce(remote_histogram)
      return global_histograms

  class histogram_array_iterator(slycat.analysis.worker.array_iterator):
    def __init__(self, owner):
      slycat.analysis.worker.array_iterator.__init__(self, owner)
      self.iterations = 0
    def next(self):
      if self.iterations:
        raise StopIteration()
      self.iterations += 1
      self.histograms = self.owner.calculate_global_histograms()
    def coordinates(self):
      return numpy.array([0], dtype="int64")
    def shape(self):
      return numpy.array([self.owner.bin_count], dtype="int64")
    def values(self, attribute):
      return self.histograms[attribute].result()
  context.register_plugin_function("histogram", histogram)
