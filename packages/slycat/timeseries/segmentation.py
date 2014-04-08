# coding: utf-8
"""Functionality for segmenting (adaptively subsampling) timeseries.

For details, see:

[1] E. Keogh, S. Chu, D. Hart, and M. Pazzani, “An online algorithm for
segmenting time series,” presented at the Data Mining, 2001. ICDM 2001,
Proceedings IEEE International Conference on, 2001, pp. 289–296.
"""

import numpy

def sum_of_squares(times, values):
  """Return the sum-of-squares error if the given set of times and values were replaced with a single linear segment using the first and last samples."""
  estimated = numpy.interp(times, times[[0, -1]], values[[0, -1]])
  return numpy.sum(numpy.square(values - estimated))

def bottom_up(times, values, max_error):
  """Return the bottom-up segmentation of a timeseries as a (times, values) tuple.

  The returned timeseries will contain a subset of the input samples, chosen so
  that no segment exceeds the supplied max_error.
  """
  anchors = numpy.ones(len(times), dtype="bool")

  errors = numpy.array([numpy.inf] + [sum_of_squares(times[i-1:i+2], values[i-1:i+2]) for i in range(1, len(times)-1)] + [numpy.inf])
  while numpy.any(errors < max_error):
    choice = numpy.argmin(errors)
    anchors[choice] = False
    errors[choice] = numpy.inf
    remaining = numpy.flatnonzero(anchors == True)
    left = remaining[remaining < choice][-2:]
    right = remaining[remaining > choice][:2]
    if len(left) == 2:
      errors[left[1]] = sum_of_squares(times[left[0]:right[0]+1], values[left[0]:right[0]+1])
    if len(right) == 2:
      errors[right[0]] = sum_of_squares(times[left[-1]:right[1]+1], values[left[-1]:right[1]+1])

  return times[anchors], values[anchors]

