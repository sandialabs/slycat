# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def register_client_plugin(context):
  import slycat.analysis.client

  def histogram(connection, source, bins=10):
    """Compute histograms for each attribute of a source array.

    Signature: histogram(source, bins=10)

    Returns a new 1D array with length N (number of bins) and the same number
    of attributes as the source array.  Each output attribute will contain a
    histogram (count of input values that fell within the range of a given bin)
    computed from the corresponding attribute in the source array.

    If the "bins" parameter is an integer (the default), it specifies that each
    output histogram will be computed using N equal-width bins sized to include
    the full range of the corresponding input attribute values.  If the "bins"
    parameter is an array-like object (a list or a numpy array), it should
    contain N+1 values which designate the edges of N bins, allowing you to
    specify varying-width bins.

    Note that if you specify a bin count, the algorithm must make two passes
    over the source data - one to compute the bin edges for the data, and a
    second to compute the histograms.  When working with large data, you may
    wish to supply the bin edges explicitly, to save time.

    Also consider that if you specify bin edges, they will apply to every
    attribute in the soure array.  This may-or-may-not make sense, depending on
    the domain of the source attributes.

    String attributes will produce empty (all zero count) histograms.

      >>> autos = load("../data/automobiles.csv", format=["string"]*2 + ["float64"]*6)

      >>> scan(attributes(autos))
        {i} name, type
      * {0} Model, string
        {1} Origin, string
        {2} Year, float64
        {3} Cylinders, float64
        {4} Acceleration, float64
        {5} Displacement, float64
        {6} Horsepower, float64
        {7} MPG, float64

      >>> scan(histogram(autos, bins=10))
        {bin} hist_Model, hist_Origin, hist_Year, hist_Cylinders, hist_Acceleration, hist_Displacement, hist_Horsepower, hist_MPG
      * {0} 0, 0, 64, 4, 7, 108, 28, 13
        {1} 0, 0, 28, 0, 18, 91, 95, 78
        {2} 0, 0, 40, 207, 51, 31, 120, 73
        {3} 0, 0, 27, 0, 86, 13, 46, 61
        {4} 0, 0, 30, 3, 93, 57, 19, 54
        {5} 0, 0, 62, 0, 81, 3, 49, 48
        {6} 0, 0, 36, 84, 45, 43, 14, 38
        {7} 0, 0, 29, 0, 14, 34, 16, 22
        {8} 0, 0, 29, 0, 7, 17, 5, 5
        {9} 0, 0, 61, 108, 4, 9, 8, 6

      # Find the range of values for miles-per-gallon:
      >>> mpg = project(autos, "MPG")

      >>> scan(aggregate(mpg, ["min", "max"]))
        {i} min_MPG, max_MPG
      * {0} 9.0, 46.6

      # Create custom bins that divide the data into "low", "medium", and "high" fuel economy:
      bins = [0, 20, 35, 100]

      >>> scan(histogram(mpg, bins))
       {bin} hist_MPG
      * {0} 214
        {1} 148
        {2} 36
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
      return [{"name":"hist_%s" % (attribute["name"]), "type":"int64"} for attribute in self.source.attributes()]
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
      histograms = [slycat.analysis.worker.accumulator.histogram(bins) for bins in bins_list]
      with self.source.iterator() as source_iterator:
        for ignored in source_iterator:
          for index, histogram in enumerate(histograms):
            histogram.accumulate(source_iterator.values(index))
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
