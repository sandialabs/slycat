import numpy
import sys

from slycat.analysis.worker.accumulator import *

def test_average_basic_nan():
  a = average()
  a.accumulate(numpy.array([1, 2, 3]))
  a.accumulate(numpy.array([4, numpy.nan, 5]))
  numpy.testing.assert_equal(a.result(), 3)

def test_average_basic_string():
  a = average()
  a.accumulate(numpy.array(["b", "c", "d"]))
  a.accumulate(numpy.array(["a", "b", "c"]))
  numpy.testing.assert_equal(a.result(), None)

def test_count_basic_nan():
  a = count()
  a.accumulate(numpy.array([1, 2, 3]))
  a.accumulate(numpy.array([4, numpy.nan, 5]))
  numpy.testing.assert_equal(a.result(), 5)

def test_count_basic_string():
  a = count()
  a.accumulate(numpy.array(["b", "c", "d"]))
  a.accumulate(numpy.array(["a", "b", "c"]))
  numpy.testing.assert_equal(a.result(), 6)

def test_distinct_basic_nan():
  a = distinct()
  a.accumulate(numpy.array([1, 2, 2]))
  a.accumulate(numpy.array([numpy.nan, numpy.nan, 5]))
  numpy.testing.assert_equal(a.result(), 3)

def test_distinct_basic_string():
  a = distinct()
  a.accumulate(numpy.array(["b", "c", "d"]))
  a.accumulate(numpy.array(["a", "b", "c"]))
  numpy.testing.assert_equal(a.result(), 4)

def test_maximum_basic_nan():
  a = maximum()
  a.accumulate(numpy.array([1, 2, 3]))
  a.accumulate(numpy.array([4, numpy.nan, 6]))
  numpy.testing.assert_equal(a.result(), 6)

def test_maximum_basic_string():
  a = maximum()
  a.accumulate(numpy.array(["b", "c", "d"]))
  a.accumulate(numpy.array(["a", "b", "c"]))
  numpy.testing.assert_equal(a.result(), "d")

def test_minimum_basic_nan():
  a = minimum()
  a.accumulate(numpy.array([1, numpy.nan, 3]))
  a.accumulate(numpy.array([4, 5, 6]))
  numpy.testing.assert_equal(a.result(), 1)

def test_minimum_basic_string():
  a = minimum()
  a.accumulate(numpy.array(["b", "c", "d"]))
  a.accumulate(numpy.array(["a", "b", "c"]))
  numpy.testing.assert_equal(a.result(), "a")

def test_summation_basic_nan():
  a = summation()
  a.accumulate(numpy.array([1, numpy.nan, 3]))
  a.accumulate(numpy.array([4, 5, 6]))
  numpy.testing.assert_equal(a.result(), 19)

def test_summation_basic_string():
  a = summation()
  a.accumulate(numpy.array(["b", "c", "d"]))
  a.accumulate(numpy.array(["a", "b", "c"]))
  numpy.testing.assert_equal(a.result(), None)

def test_histogram_reduce():
  h1 = histogram(bins=numpy.linspace(0, 1, 10))
  h1.accumulate(numpy.random.random(100))
  h2 = histogram(bins=numpy.linspace(0, 1, 10))
  h2.accumulate(numpy.random.random(100))
  h3 = histogram(bins=numpy.linspace(0, 1, 10))
  h3.reduce(h1)
  h3.reduce(h2)
  numpy.testing.assert_equal(len(h3.result()), 9)
  numpy.testing.assert_array_equal(h3.result(), h1.result() + h2.result())

def test_histogram_reduce_string():
  h1 = histogram(bins=numpy.linspace(0, 1, 10))
  h1.accumulate(numpy.array(["1", "2", "3"]))
  h2 = histogram(bins=numpy.linspace(0, 1, 10))
  h2.accumulate(numpy.array(["a", "b", "c"]))
  h3 = histogram(bins=numpy.linspace(0, 1, 10))
  h3.reduce(h1)
  h3.reduce(h2)
  numpy.testing.assert_equal(len(h3.result()), 9)
  numpy.testing.assert_array_equal(h3.result(), h1.result() + h2.result())
  numpy.testing.assert_array_equal(h3.result(), numpy.zeros(9))
