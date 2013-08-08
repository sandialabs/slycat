import numpy
import sys

from slycat.analysis.worker.accumulator import *

def test_average_basic_nan():
  a = average()
  a.accumulate(numpy.ma.array([1, 2, 3]))
  a.accumulate(numpy.ma.array([4, numpy.nan, 5]))
  numpy.testing.assert_equal(a.result(), 3)

def test_count_basic_nan():
  a = count()
  a.accumulate(numpy.ma.array([1, 2, 3]))
  a.accumulate(numpy.ma.array([4, numpy.nan, 5]))
  numpy.testing.assert_equal(a.result(), 5)

def test_count_basic_string():
  a = string_count()
  a.accumulate(numpy.ma.array(["b", "c", "d"]))
  a.accumulate(numpy.ma.array(["a", "b", "c"]))
  numpy.testing.assert_equal(a.result(), 6)

def test_distinct_basic_nan():
  a = distinct()
  a.accumulate(numpy.ma.array([1, 2, 2]))
  a.accumulate(numpy.ma.array([numpy.nan, numpy.nan, 5]))
  numpy.testing.assert_equal(a.result(), 3)

def test_distinct_basic_string():
  a = string_distinct()
  a.accumulate(numpy.ma.array(["b", "c", "d"]))
  a.accumulate(numpy.ma.array(["a", "b", "c"]))
  numpy.testing.assert_equal(a.result(), 4)

def test_maximum_basic_nan():
  a = maximum("float64")
  a.accumulate(numpy.ma.array([1, 2, 3]))
  a.accumulate(numpy.ma.array([4, numpy.nan, 6]))
  numpy.testing.assert_equal(a.result(), 6)

def test_maximum_basic_string():
  a = string_maximum()
  a.accumulate(numpy.ma.array(["b", "c", "d"]))
  a.accumulate(numpy.ma.array(["a", "b", "c"]))
  numpy.testing.assert_equal(a.result(), "d")

def test_minimum_basic_nan():
  a = minimum("float64")
  a.accumulate(numpy.ma.array([1, numpy.nan, 3]))
  a.accumulate(numpy.ma.array([4, 5, 6]))
  numpy.testing.assert_equal(a.result(), 1)

def test_minimum_basic_string():
  a = string_minimum()
  a.accumulate(numpy.ma.array(["b", "c", "d"]))
  a.accumulate(numpy.ma.array(["a", "b", "c"]))
  numpy.testing.assert_equal(a.result(), "a")

def test_summation_basic_nan():
  a = summation("float64")
  a.accumulate(numpy.ma.array([1, numpy.nan, 3]))
  a.accumulate(numpy.ma.array([4, 5, 6]))
  numpy.testing.assert_equal(a.result(), 19)

def test_histogram_nan():
  a = numpy.arange(100, dtype="float64")
  a[3] = numpy.nan
  a[55] = numpy.nan
  h = histogram(bins=numpy.ma.array([0, 25, 50, 75, 100]))
  h.accumulate(a)
  numpy.testing.assert_array_equal(h.result(), numpy.ma.array([24, 25, 24, 25]))

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
  h1.accumulate(numpy.ma.array(["1", "2", "3"]))
  h2 = histogram(bins=numpy.linspace(0, 1, 10))
  h2.accumulate(numpy.ma.array(["a", "b", "c"]))
  h3 = histogram(bins=numpy.linspace(0, 1, 10))
  h3.reduce(h1)
  h3.reduce(h2)
  numpy.testing.assert_equal(len(h3.result()), 9)
