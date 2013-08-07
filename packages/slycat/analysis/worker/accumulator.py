# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import numpy

class accumulator(object):
  """Abstract interface for an accumulator object that performs an incremental statistical calculation."""
  def accumulate(self, observations):
    """Pass a set of observations (a chunk / numpy array) into the accumulator, updating its internal state."""
    raise NotImplementedError()
  def reduce(self, other):
    """Pass another accumulator of the same type into this accumulator, consolidating both states."""
    raise NotImplementedError()
  def result(self):
    """Returns the statistic computed by the accumulator."""
    raise NotImplementedError()

def create(type):
  if type == "avg":
    return average()
  elif type == "count":
    return count()
  elif type == "distinct":
    return distinct()
  elif type == "max":
    return maximum()
  elif type == "min":
    return minimum()
  elif type == "sum":
    return summation()
  else:
    raise Exception("Unknown accumulator type: %s" % type)

class average(accumulator):
  def __init__(self):
    self.count = 0
    self.sum = 0.0
  def accumulate(self, observations):
    if observations.dtype.char != "S":
      self.count += observations.size
      self.sum += observations.sum()
  def reduce(self, other):
    self.count += other.count
    self.sum += other.sum
  def result(self):
    return self.sum / self.count if self.count else None

class count(accumulator):
  def __init__(self):
    self.count = 0
  def accumulate(self, observations):
    self.count += observations.size
  def reduce(self, other):
    self.count += other.count
  def result(self):
    return self.count

class distinct(accumulator):
  def __init__(self):
    self.unique = None
  def accumulate(self, observations):
    if self.unique is None:
      self.unique = numpy.unique(observations)
    else:
      self.unique = numpy.union1d(self.unique, observations)
  def reduce(self, other):
    self.unique = other.unique if self.unique is None else self.unique if other.unique is None else numpy.union1d(self.unique, other.unique)
  def result(self):
    return self.unique.size if self.unique is not None else None

class maximum(accumulator):
  def __init__(self):
    self.max = None
  @staticmethod
  def flexible_max(observations):
    if observations.dtype.char == "S":
      return max(observations)
    else:
      return observations.max()
  def accumulate(self, observations):
    self.max = maximum.flexible_max(observations) if self.max is None else max(self.max, maximum.flexible_max(observations))
  def reduce(self, other):
    self.max = other.max if self.max is None else self.max if other.max is None else max(self.max, other.max)
  def result(self):
    return self.max

class minimum(accumulator):
  def __init__(self):
    self.min = None
  @staticmethod
  def flexible_min(observations):
    if observations.dtype.char == "S":
      return min(observations)
    else:
      return observations.min()
  def accumulate(self, observations):
    self.min = minimum.flexible_min(observations) if self.min is None else min(self.min, minimum.flexible_min(observations))
  def reduce(self, other):
    self.min = other.min if self.min is None else self.min if other.min is None else min(self.min, other.min)
  def result(self):
    return self.min

class summation(accumulator):
  def __init__(self):
    self.count = 0
    self.sum = 0.0
  def accumulate(self, observations):
    if observations.dtype.char != "S":
      self.count += observations.size
      self.sum += observations.sum()
  def reduce(self, other):
    self.count += other.count
    self.sum += other.sum
  def result(self):
    return self.sum if self.count else None

class histogram(accumulator):
  def __init__(self, bins):
    self.bins = bins
    self.histogram = None
  def __repr__(self):
    return "<histogram %s %s>" % (self.bins, self.histogram)
  def flexible_histogram(self, observations):
    if observations.dtype.char == "S":
      return numpy.zeros(len(self.bins) - 1, dtype="int64")
    else:
      return numpy.histogram(observations, self.bins)[0]
  def accumulate(self, observations):
    if self.histogram is None:
      self.histogram = self.flexible_histogram(observations)
    else:
      self.histogram += self.flexible_histogram(observations)
  def reduce(self, other):
    self.histogram = other.histogram if self.histogram is None else self.histogram if other.histogram is None else self.histogram + other.histogram
  def result(self):
    return self.histogram

