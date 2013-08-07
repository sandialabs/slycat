import numpy
import sys

from slycat.analysis.worker.accumulator import *

def test_min_basic_string():
  m = minimum()
  m.accumulate(numpy.array(["a", "b", "c"]))
  numpy.testing.assert_equal(m.result(), "a")

def test_min_reduce_string():
  m = minimum()
  m.accumulate(numpy.array(["b", "c", "d"]))
  m.accumulate(numpy.array(["a", "b", "c"]))
  numpy.testing.assert_equal(m.result(), "a")

def test_histogram_basic():
  h = histogram(10)
  h.accumulate(numpy.random.random(100))
  numpy.testing.assert_equal(len(h.result()), 10)

def test_histogram_reduce():
  h1 = histogram(10)
  h1.accumulate(numpy.random.random(100))
  h2 = histogram(10)
  h2.accumulate(numpy.random.random(100))
  h3 = histogram(10)
  h3.reduce(h1)
  h3.reduce(h2)
  numpy.testing.assert_equal(len(h3.result()), 10)
  numpy.testing.assert_array_equal(h3.result(), h1.result() + h2.result())
