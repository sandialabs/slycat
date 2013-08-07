# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def register_client_plugin(context):
  import slycat.analysis.client

  def histogram(connection, source, bins):
    """Return an array containing one-or-more histograms from a source array.
    """
    source = slycat.analysis.client.require_array(source)
    if isinstance(bins, tuple):
      bins = list(bins)
    elif isinstance(bins, list):
      pass
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
      self.bin_count = len(bins) - 1
    def dimensions(self):
      return [{"name":"i", "type":"int64", "begin":0, "end":self.bin_count, "chunk-size":self.bin_count}]
    def attributes(self):
      return [{"name":"hist_%s" % (attribute["name"]), "type":attribute["type"]} for attribute in self.source.attributes()]
    def iterator(self):
      if self.worker_index == 0:
        return self.pyro_register(histogram_array_iterator(self))
      else:
        return self.pyro_register(slycat.analysis.worker.null_array_iterator(self))
    def calculate_local(self):
      source_attributes = self.source.attributes()
      histograms = [slycat.analysis.worker.accumulator.histogram(self.bins) for source_attribute in source_attributes]
      with self.source.iterator() as source_iterator:
        for ignored in source_iterator:
          for index, histogram in enumerate(histograms):
            histogram.accumulate(source_iterator.values(index))
      return histograms
    def calculate_global(self):
      histograms = [Pyro4.async(sibling).calculate_local() for sibling in self.siblings]
      histograms = [histogram.value for histogram in histograms]
      histograms = zip(*histograms)
      global_histograms = [slycat.analysis.worker.accumulator.histogram(self.bins) for histogram in histograms]
      for local_histogram, remote_histograms in zip(global_histograms, histograms):
        for remote_histogram in remote_histograms:
          local_histogram.reduce(remote_histogram)
      return global_histograms

  class histogram_array_iterator(slycat.analysis.worker.array_iterator):
    def __init__(self, owner):
      slycat.analysis.worker.array_iterator.__init__(self, owner)
      self.iterations = 0
    def next(self):
      if self.iterations:
        raise StopIteration()
      self.iterations += 1
      self.histograms = self.owner.calculate_global()
    def coordinates(self):
      return numpy.array([0], dtype="int64")
    def shape(self):
      return numpy.array([self.owner.bin_count], dtype="int64")
    def values(self, attribute):
      return self.histograms[attribute].result()
  context.register_plugin_function("histogram", histogram)
