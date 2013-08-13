import numpy

from slycat.analysis.worker import worker_chunk_ranges

def test_10_4():
  numpy.testing.assert_equal(list(worker_chunk_ranges(10, 4)), [(0, 3), (3, 6), (6, 8), (8, 10)])

def test_9_4():
  numpy.testing.assert_equal(list(worker_chunk_ranges(9, 4)), [(0, 3), (3, 5), (5, 7), (7, 9)])

def test_8_4():
  numpy.testing.assert_equal(list(worker_chunk_ranges(8, 4)), [(0, 2), (2, 4), (4, 6), (6, 8)])

def test_7_4():
  numpy.testing.assert_equal(list(worker_chunk_ranges(7, 4)), [(0, 2), (2, 4), (4, 6), (6, 7)])

def test_6_4():
  numpy.testing.assert_equal(list(worker_chunk_ranges(6, 4)), [(0, 2), (2, 4), (4, 5), (5, 6)])

def test_5_4():
  numpy.testing.assert_equal(list(worker_chunk_ranges(5, 4)), [(0, 2), (2, 3), (3, 4), (4, 5)])

def test_4_4():
  numpy.testing.assert_equal(list(worker_chunk_ranges(4, 4)), [(0, 1), (1, 2), (2, 3), (3, 4)])

def test_3_4():
  numpy.testing.assert_equal(list(worker_chunk_ranges(3, 4)), [(0, 1), (1, 2), (2, 3), (3, 3)])

def test_2_4():
  numpy.testing.assert_equal(list(worker_chunk_ranges(2, 4)), [(0, 1), (1, 2), (2, 2), (2, 2)])

def test_1_4():
  numpy.testing.assert_equal(list(worker_chunk_ranges(1, 4)), [(0, 1), (1, 1), (1, 1), (1, 1)])

