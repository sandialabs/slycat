import numpy

from slycat.analysis.worker.api import worker_chunk_counts

def test_10_4():
  numpy.testing.assert_equal(list(worker_chunk_counts(10, 4)), [3, 3, 2, 2])

def test_9_4():
  numpy.testing.assert_equal(list(worker_chunk_counts(9, 4)), [3, 2, 2, 2])

def test_8_4():
  numpy.testing.assert_equal(list(worker_chunk_counts(8, 4)), [2, 2, 2, 2])

def test_7_4():
  numpy.testing.assert_equal(list(worker_chunk_counts(7, 4)), [2, 2, 2, 1])

def test_6_4():
  numpy.testing.assert_equal(list(worker_chunk_counts(6, 4)), [2, 2, 1, 1])

def test_5_4():
  numpy.testing.assert_equal(list(worker_chunk_counts(5, 4)), [2, 1, 1, 1])

def test_4_4():
  numpy.testing.assert_equal(list(worker_chunk_counts(4, 4)), [1, 1, 1, 1])

def test_3_4():
  numpy.testing.assert_equal(list(worker_chunk_counts(3, 4)), [1, 1, 1, 0])

def test_2_4():
  numpy.testing.assert_equal(list(worker_chunk_counts(2, 4)), [1, 1, 0, 0])

def test_1_4():
  numpy.testing.assert_equal(list(worker_chunk_counts(1, 4)), [1, 0, 0, 0])

