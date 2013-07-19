import numpy

from slycat.analysis.worker.api import chunk_range

def test_3_0_4():
  numpy.testing.assert_equal(chunk_range(3, 0, 4), (0, 1))

def test_3_1_4():
  numpy.testing.assert_equal(chunk_range(3, 1, 4), (1, 2))

def test_3_2_4():
  numpy.testing.assert_equal(chunk_range(3, 2, 4), (2, 3))

def test_3_3_4():
  numpy.testing.assert_equal(chunk_range(3, 3, 4), (3, 3))

def test_4_0_4():
  numpy.testing.assert_equal(chunk_range(4, 0, 4), (0, 1))

def test_4_1_4():
  numpy.testing.assert_equal(chunk_range(4, 1, 4), (1, 2))

def test_4_2_4():
  numpy.testing.assert_equal(chunk_range(4, 2, 4), (2, 3))

def test_4_3_4():
  numpy.testing.assert_equal(chunk_range(4, 3, 4), (3, 4))

def test_5_0_4():
  numpy.testing.assert_equal(chunk_range(5, 0, 4), (0, 2))

def test_5_1_4():
  numpy.testing.assert_equal(chunk_range(5, 1, 4), (2, 3))

def test_5_2_4():
  numpy.testing.assert_equal(chunk_range(5, 2, 4), (3, 4))

def test_5_3_4():
  numpy.testing.assert_equal(chunk_range(5, 3, 4), (4, 5))

