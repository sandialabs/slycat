import numpy

from slycat.analysis.worker.api import chunk_count

def test_10_10():
 numpy.testing.assert_equal(chunk_count((10,), (10,)), 1)

def test_10_9():
 numpy.testing.assert_equal(chunk_count((10,), (9,)), 2)

def test_10_8():
 numpy.testing.assert_equal(chunk_count((10,), (8,)), 2)

def test_10_7():
 numpy.testing.assert_equal(chunk_count((10,), (7,)), 2)

def test_10_6():
 numpy.testing.assert_equal(chunk_count((10,), (6,)), 2)

def test_10_5():
 numpy.testing.assert_equal(chunk_count((10,), (5,)), 2)

def test_10_4():
 numpy.testing.assert_equal(chunk_count((10,), (4,)), 3)

def test_10_3():
 numpy.testing.assert_equal(chunk_count((10,), (3,)), 4)

def test_10_2():
 numpy.testing.assert_equal(chunk_count((10,), (2,)), 5)

def test_10_1():
 numpy.testing.assert_equal(chunk_count((10,), (1,)), 10)

