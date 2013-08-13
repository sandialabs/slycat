import numpy

from slycat.analysis.worker import worker_chunks

def test_10_10_4():
  numpy.testing.assert_equal(list(worker_chunks((10,), (10,), 4)), [(0, 0, numpy.array([0]), numpy.array([10]))])

def test_10_9_4():
  numpy.testing.assert_equal(list(worker_chunks((10,), (9,), 4)), [(0, 0, [0], [9]), (1, 1, [9], [10])])

def test_10_8_4():
  numpy.testing.assert_equal(list(worker_chunks((10,), (8,), 4)), [(0, 0, [0], [8]), (1, 1, [8], [10])])

def test_10_7_4():
  numpy.testing.assert_equal(list(worker_chunks((10,), (7,), 4)), [(0, 0, [0], [7]), (1, 1, [7], [10])])

def test_10_6_4():
  numpy.testing.assert_equal(list(worker_chunks((10,), (6,), 4)), [(0, 0, [0], [6]), (1, 1, [6], [10])])

def test_10_5_4():
  numpy.testing.assert_equal(list(worker_chunks((10,), (5,), 4)), [(0, 0, [0], [5]), (1, 1, [5], [10])])

def test_10_4_4():
  numpy.testing.assert_equal(list(worker_chunks((10,), (4,), 4)), [(0, 0, [0], [4]), (1, 1, [4], [8]), (2, 2, [8], [10])])

def test_10_3_4():
  numpy.testing.assert_equal(list(worker_chunks((10,), (3,), 4)), [(0, 0, [0], [3]), (1, 1, [3], [6]), (2, 2, [6], [9]), (3, 3, [9], [10])])

def test_10_2_4():
  numpy.testing.assert_equal(list(worker_chunks((10,), (2,), 4)), [(0, 0, [0], [2]), (1, 0, [2], [4]), (2, 1, [4], [6]), (3, 2, [6], [8]), (4, 3, [8], [10])])

