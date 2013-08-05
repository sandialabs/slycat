# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

from slycat.analysis import *

def require_array_schema(array, dimensions, attributes):
  expected_dimensions = [{"name":name,"type":type,"begin":begin,"end":end,"chunk-size":chunk_size} for name, type, begin, end, chunk_size in dimensions]
  array_dimensions = array.dimensions
  if array_dimensions != expected_dimensions:
    raise Exception("dimension mismatch: expected %s, got %s" % (expected_dimensions, array_dimensions))

  expected_attributes = [{"name":name,"type":type} for name, type in attributes]
  array_attributes = array.attributes
  if array_attributes != expected_attributes:
    raise Exception("attribute mismatch: expected %s, got %s" % (expected_attributes, array_attributes))
  assert(array.shape == tuple([end - begin for name, type, begin, end, chunk_size in dimensions]))

def test_redimension_d0__a0():
  array1 = random((4, 4), (2, 2))
  array2 = redimension(array1, ["d0"], ["val"])
  require_array_schema(array2, [("d0", "int64", 0, 4, 2)], [("val", "float64")])
  scan(array2)

def test_redimension_d0_d1__a3_a0():
  array1 = random((4, 4), (2, 2))
  array2 = apply(array1, "val2", "val * val")
  array3 = apply(array2, "val3", "val * val * val")
  array4 = redimension(array3, ["d0", "d1"], ["val3", "val"])
  require_array_schema(array4, [("d0", "int64", 0, 4, 2), ("d1", "int64", 0, 4, 2)], [("val3", "float64"), ("val", "float64")])
  #numpy.testing.assert_array_almost_equal(values(array4, 0), values(array3, 2))
  #numpy.testing.assert_array_almost_equal(values(array4, 1), values(array1, 0))
  scan(array4)

def test_redimension_d0_d1__d0_d1():
  array1 = random((4, 4), (2, 2))
  array2 = redimension(array1, ["d0", "d1"], ["val", "d0", "d1"])
  require_array_schema(array2, [("d0", "int64", 0, 4, 2), ("d1", "int64", 0, 4, 2)], [("val", "float64"), ("d0", "int64"), ("d1", "int64")])
  #numpy.testing.assert_array_almost_equal(values(array2, 0), values(array1, 0))
  #numpy.testing.assert_array_equal(values(array2, 1), numpy.array([[0, 0, 0, 0], [1, 1, 1, 1], [2, 2, 2, 2], [3, 3, 3, 3]], dtype="int64"))
  #numpy.testing.assert_array_equal(values(array2, 2), numpy.array([[0, 1, 2, 3], [0, 1, 2, 3], [0, 1, 2, 3], [0, 1, 2, 3]], dtype="int64"))
  scan(array2)

def test_redimension_d0_a1__a0():
  array1 = random((4), (2))
  array2 = apply(array1, ("j", "int64"), "d0 % 2")
  array3 = redimension(array2, ["d0", "j"], ["val"])
  require_array_schema(array3, [("d0", "int64", 0, 4, 2), ("j", "int64", 0, 2, 2)], [("val", "float64")])
  scan(array3)

