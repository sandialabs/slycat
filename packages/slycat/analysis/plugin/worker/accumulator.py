# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import numpy

class accumulator(object):
  """Abstract interface for an accumulator object that performs an incremental statistical calculation."""
  def dtype(self):
    """Return the data type for this accumulator."""
    raise NotImplementedError()
  def accumulate(self, observations):
    """Pass a set of observations (a numpy array) into the accumulator, updating its internal state."""
    raise NotImplementedError()
  def reduce(self, other):
    """Pass another accumulator of the same type into this accumulator, consolidating both states."""
    raise NotImplementedError()
  def result(self):
    """Return the statistic computed by the accumulator as a numpy masked array."""
    raise NotImplementedError()

def create(type, dtype):
  if type == "avg":
    return average() if dtype != "string" else string_average()
  elif type == "count":
    return count() if dtype != "string" else string_count()
  elif type == "distinct":
    return distinct() if dtype != "string" else string_distinct()
  elif type == "max":
    return maximum(dtype) if dtype != "string" else string_maximum()
  elif type == "min":
    return minimum(dtype) if dtype != "string" else string_minimum()
  elif type == "sum":
    return summation(dtype) if dtype != "string" else string_summation()
  else:
    raise Exception("Unknown accumulator type: %s" % type)

class average(accumulator):
  def __init__(self):
    self.count = 0
    self.sum = 0.0
  def dtype(self):
    return "float64"
  def __repr__(self):
    return "<slycat.analysis.worker.accumulator.average count: %s sum: %s result: %s>" % (self.count, self.sum, self.result())
  def accumulate(self, observations):
    self.count += numpy.sum(~numpy.isnan(observations))
    self.sum += numpy.nansum(observations)
  def reduce(self, other):
    self.count += other.count
    self.sum += other.sum
  def result(self):
    if self.count:
      return numpy.ma.array([self.sum / self.count], dtype="float64")
    else:
      return numpy.ma.array([0], mask=True, dtype="float64")

class string_average(accumulator):
  def __repr__(self):
    return "<slycat.analysis.worker.accumulator.string_average>" % (self.count, self.sum, self.result())
  def dtype(self):
    return "float64"
  def accumulate(self, observations):
    pass
  def reduce(self, other):
    pass
  def result(self):
    return numpy.ma.array([0], mask = True, dtype="float64")

class count(accumulator):
  def __init__(self):
    self.count = 0
  def __repr__(self):
    return "<slycat.analysis.worker.accumulator.count result: %s>" % (self.result())
  def dtype(self):
    return "int64"
  def accumulate(self, observations):
    self.count += numpy.sum(~numpy.isnan(observations))
  def reduce(self, other):
    self.count += other.count
  def result(self):
    return numpy.ma.array([self.count], dtype="int64")

class string_count(accumulator):
  def __init__(self):
    self.count = 0
  def __repr__(self):
    return "<slycat.analysis.worker.accumulator.string_count result: %s>" % (self.result())
  def dtype(self):
    return "int64"
  def accumulate(self, observations):
    self.count += observations.size
  def reduce(self, other):
    self.count += other.count
  def result(self):
    return numpy.ma.array([self.count], dtype="int64")

class distinct(accumulator):
  def __init__(self):
    self.unique = None
  def __repr__(self):
    return "<slycat.analysis.worker.accumulator.distinct result: %s>" % (self.result())
  def dtype(self):
    return "int64"
  @staticmethod
  def nan_unique(observations):
    return numpy.unique(numpy.ma.compressed(observations[~numpy.isnan(observations)]))
  def accumulate(self, observations):
    if self.unique is None:
      self.unique = distinct.nan_unique(observations)
    else:
      self.unique = numpy.union1d(self.unique, distinct.nan_unique(observations))
  def reduce(self, other):
    self.unique = other.unique if self.unique is None else self.unique if other.unique is None else numpy.union1d(self.unique, other.unique)
  def result(self):
    if self.unique is not None:
      return numpy.ma.array([self.unique.size], dtype="int64")
    else:
      return numpy.ma.array([0], mask=True, dtype="int64")

class string_distinct(accumulator):
  def __init__(self):
    self.unique = None
  def __repr__(self):
    return "<slycat.analysis.worker.accumulator.string_distinct result: %s>" % (self.result())
  def dtype(self):
    return "int64"
  def accumulate(self, observations):
    if self.unique is None:
      self.unique = numpy.unique(observations)
    else:
      self.unique = numpy.union1d(self.unique, numpy.unique(observations))
  def reduce(self, other):
    self.unique = other.unique if self.unique is None else self.unique if other.unique is None else numpy.union1d(self.unique, other.unique)
  def result(self):
    if self.unique is not None:
      return numpy.ma.array([self.unique.size], dtype="int64")
    else:
      return numpy.ma.array([0], mask=True, dtype="int64")

class maximum(accumulator):
  def __init__(self, dtype):
    self.max = None
    self._dtype = dtype
  def __repr__(self):
    return "<slycat.analysis.worker.accumulator.maximum result: %s>" % (self.result())
  def dtype(self):
    return self._dtype
  @staticmethod
  def nan_max(observations):
    return numpy.ma.max(observations[~numpy.isnan(observations)])
  def accumulate(self, observations):
    self.max = maximum.nan_max(observations) if self.max is None else max(self.max, maximum.nan_max(observations))
  def reduce(self, other):
    self.max = other.max if self.max is None else self.max if other.max is None else max(self.max, other.max)
  def result(self):
    if self.max is not None:
      return numpy.ma.array([self.max], dtype=self._dtype)
    else:
      return numpy.ma.array([0], dtype=self._dtype)

class string_maximum(accumulator):
  def __init__(self):
    self.max = None
  def __repr__(self):
    return "<slycat.analysis.worker.accumulator.string_maximum result: %s>" % (self.result())
  def dtype(self):
    return "string"
  def accumulate(self, observations):
    self.max = max(observations) if self.max is None else max(self.max, max(observations))
  def reduce(self, other):
    self.max = other.max if self.max is None else self.max if other.max is None else max(self.max, other.max)
  def result(self):
    if self.max is not None:
      return numpy.ma.array([self.max], dtype="string")
    else:
      return numpy.ma.array([""], dtype="string")

class minimum(accumulator):
  def __init__(self, dtype):
    self.min = None
    self._dtype = dtype
  def __repr__(self):
    return "<slycat.analysis.worker.accumulator.minimum result: %s>" % (self.result())
  def dtype(self):
    return self._dtype
  @staticmethod
  def nan_min(observations):
    return numpy.ma.min(observations[~numpy.isnan(observations)])
  def accumulate(self, observations):
    self.min = minimum.nan_min(observations) if self.min is None else min(self.min, minimum.nan_min(observations))
  def reduce(self, other):
    self.min = other.min if self.min is None else self.min if other.min is None else min(self.min, other.min)
  def result(self):
    if self.min is not None:
      return numpy.ma.array([self.min], dtype=self._dtype)
    else:
      return numpy.ma.array([0], dtype=self._dtype)

class string_minimum(accumulator):
  def __init__(self):
    self.min = None
  def __repr__(self):
    return "<slycat.analysis.worker.accumulator.string_minimum result: %s>" % (self.result())
  def dtype(self):
    return "string"
  def accumulate(self, observations):
    self.min = min(observations) if self.min is None else min(self.min, min(observations))
  def reduce(self, other):
    self.min = other.min if self.min is None else self.min if other.min is None else min(self.min, other.min)
  def result(self):
    if self.min is not None:
      return numpy.ma.array([self.min], dtype="string")
    else:
      return numpy.ma.array([""], dtype="string")

class summation(accumulator):
  def __init__(self, dtype):
    self.count = 0
    self.sum = 0.0
    self._dtype = dtype
  def __repr__(self):
    return "<slycat.analysis.worker.accumulator.summation result: %s>" % (self.result())
  def dtype(self):
    return self._dtype
  def accumulate(self, observations):
    self.count += numpy.sum(~numpy.isnan(observations))
    self.sum += numpy.nansum(observations)
  def reduce(self, other):
    self.count += other.count
    self.sum += other.sum
  def result(self):
    if self.count:
      return numpy.ma.array([self.sum], dtype=self._dtype)
    else:
      return numpy.ma.array([0], mask=True, dtype=self._dtype)

class string_summation(accumulator):
  def __repr__(self):
    return "<slycat.analysis.worker.accumulator.string_summation>" % (self.result())
  def dtype(self):
    return "string"
  def accumulate(self, observations):
    pass
  def reduce(self, other):
    pass
  def result(self):
    return numpy.ma.array([""], mask = True, dtype="string")

class histogram(accumulator):
  def __init__(self, bins):
    self.bins = bins
    self.histogram = None
  def __repr__(self):
    return "<slycat.analysis.worker.accumulator.summation bins: %s histogram: %s>" % (self.bins, self.histogram)
  def dtype(self):
    return "int64"
  def flexible_histogram(self, observations):
    if observations.dtype.char == "S":
      return numpy.ma.array(numpy.zeros(len(self.bins) - 1), mask=True, dtype="int64")
    else:
      return numpy.ma.asarray(numpy.histogram(observations, self.bins)[0].astype("int64", copy=False))
  def accumulate(self, observations):
    self.histogram = self.flexible_histogram(observations) if self.histogram is None else self.histogram + self.flexible_histogram(observations)
  def reduce(self, other):
    self.histogram = other.histogram if self.histogram is None else self.histogram if other.histogram is None else self.histogram + other.histogram
  def result(self):
    return self.histogram

