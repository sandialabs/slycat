# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

from slycat.analysis import *
import logging
import numpy
import subprocess
import time

def setup():
  subprocess.Popen(["python", "slycat-analysis-coordinator.py", "--nameserver-port", "9092", "--log-level", "info", "--local-workers", "0"])
  time.sleep(2.0)
  for i in range(4):
    subprocess.Popen(["python", "slycat-analysis-worker.py", "--nameserver-port", "9092", "--log-level", "info"])
  time.sleep(2.0)
  log.setLevel(logging.WARNING)
  connect("127.0.0.1", 9092)

def teardown():
  for worker in workers():
    worker.shutdown()
  time.sleep(2.0)
  shutdown()
  time.sleep(2.0)

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

def test_aggregate_avg():
  array1 = random(5, 3)
  array2 = aggregate(array1, ["avg(val)"])
  require_array_schema(array2, [("i", "int64", 0, 1, 1)], [("val_avg", "float64")])
  numpy.testing.assert_array_almost_equal(value(array2), values(array1).mean())

def test_aggregate_count():
  array1 = random(5, 3)
  array2 = aggregate(array1, ["count(val)"])
  require_array_schema(array2, [("i", "int64", 0, 1, 1)], [("val_count", "float64")])
  numpy.testing.assert_array_almost_equal(value(array2), values(array1).size)

def test_aggregate_distinct():
  array1 = array(numpy.array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 14]).reshape((4, 4)))
  array2 = aggregate(array1, ["distinct(val)"])
  require_array_schema(array2, [("i", "int64", 0, 1, 1)], [("val_distinct", "float64")])
  numpy.testing.assert_array_equal(value(array2), [15])

def test_aggregate_max():
  array1 = random(5, 3)
  array2 = aggregate(array1, ["max(val)"])
  require_array_schema(array2, [("i", "int64", 0, 1, 1)], [("val_max", "float64")])
  numpy.testing.assert_array_almost_equal(value(array2), values(array1).max())

def test_aggregate_max_2():
  array1 = random(50, 10)
  array2 = aggregate(array1, ["max(val)"])
  require_array_schema(array2, [("i", "int64", 0, 1, 1)], [("val_max", "float64")])
  numpy.testing.assert_array_almost_equal(value(array2), values(array1).max())

def test_aggregate_min():
  array1 = random(5, 3)
  array2 = aggregate(array1, ["min(val)"])
  require_array_schema(array2, [("i", "int64", 0, 1, 1)], [("val_min", "float64")])
  numpy.testing.assert_array_almost_equal(value(array2), values(array1).min())

def test_aggregate_sum():
  array1 = random(5, 3)
  array2 = aggregate(array1, ["sum(val)"])
  require_array_schema(array2, [("i", "int64", 0, 1, 1)], [("val_sum", "float64")])
  numpy.testing.assert_array_almost_equal(value(array2), values(array1).sum())

def test_aggregate_multiple():
  array1 = random(5, 3)
  array2 = aggregate(array1, ["min(val)", "avg(val)", "max(val)"])
  require_array_schema(array2, [("i", "int64", 0, 1, 1)], [("val_min", "float64"), ("val_avg", "float64"), ("val_max", "float64")])
  numpy.testing.assert_array_almost_equal(value(array2, 0), values(array1).min())
  numpy.testing.assert_array_almost_equal(value(array2, 1), values(array1).mean())
  numpy.testing.assert_array_almost_equal(value(array2, 2), values(array1).max())

def test_apply_attribute():
  array1 = random(5)
  array2 = apply(array1, "val2", "val")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_equal(values(array2, 1), values(array1, 0))

def test_apply_add_attribute_constant():
  array1 = random(5)
  array2 = apply(array1, "val2", "val + 3.4")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_almost_equal(values(array2, 1), values(array1, 0) + 3.4)

def test_apply_div_attribute_constant():
  array1 = random(5)
  array2 = apply(array1, "val2", "val / 3.4")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_almost_equal(values(array2, 1), values(array1, 0) / 3.4)

def test_apply_mult_attribute_constant():
  array1 = random(5)
  array2 = apply(array1, "val2", "val * 3.4")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_almost_equal(values(array2, 1), values(array1, 0) * 3.4)

def test_apply_pow_attribute_constant():
  array1 = random(5)
  array2 = apply(array1, "val2", "val ** 2")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_almost_equal(values(array2, 1), values(array1, 0) ** 2.0)

def test_apply_sub_attribute_constant():
  array1 = random(5)
  array2 = apply(array1, "val2", "val - 3.4")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_almost_equal(values(array2, 1), values(array1, 0) - 3.4)

def test_apply_uadd_attribute():
  array1 = random(5)
  array2 = apply(array1, "val2", "+val")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_almost_equal(values(array2, 1), values(array1, 0))

def test_apply_usub_attribute():
  array1 = random(5)
  array2 = apply(array1, "val2", "-val")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_almost_equal(values(array2, 1), -values(array1, 0))

def test_apply_dimension_1d():
  array1 = random(5)
  array2 = apply(array1, "val2", "d0")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([0, 1, 2, 3, 4]))

def test_apply_dimension_2d_1():
  array1 = random((5, 5))
  array2 = apply(array1, "val2", "d0")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5), ("d1", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([[0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [2, 2, 2, 2, 2], [3, 3, 3, 3, 3], [4, 4, 4, 4, 4]]))

def test_apply_dimension_2d_2():
  array1 = random((5, 5))
  array2 = apply(array1, "val2", "d1")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5), ("d1", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([[0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4]]))

def test_apply_add_dimension_constant():
  array1 = random(5)
  array2 = apply(array1, "val2", "d0 + 1")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([1, 2, 3, 4, 5]))

def test_apply_bitand_dimension_constant():
  array1 = random(5)
  array2 = apply(array1, "val2", "d0 & 3")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([0, 1, 2, 3, 0]))

def test_apply_bitor_dimension_constant():
  array1 = random(5)
  array2 = apply(array1, "val2", "d0 | 3")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([3, 3, 3, 3, 7]))

def test_apply_bitxor_dimension_constant():
  array1 = random(5)
  array2 = apply(array1, "val2", "d0 ^ 3")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([3, 2, 1, 0, 7]))

def test_apply_div_dimension_constant():
  array1 = random(5)
  array2 = apply(array1, "val2", "d0 / 3")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_almost_equal(values(array2, 1), numpy.array([0, 0.333333, 0.666666, 1.0, 1.333333]))

def test_apply_floordiv_dimension_constant():
  array1 = random(5)
  array2 = apply(array1, "val2", "d0 // 3")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([0, 0, 0, 1, 1]))

def test_apply_eq_dimension_constant():
  array1 = random(5)
  array2 = apply(array1, "val2", "d0 == 3")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([0, 0, 0, 1, 0]))

def test_apply_gt_dimension_constant():
  array1 = random(5)
  array2 = apply(array1, "val2", "d0 > 3")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([0, 0, 0, 0, 1]))

def test_apply_gte_dimension_constant():
  array1 = random(5)
  array2 = apply(array1, "val2", "d0 >= 3")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([0, 0, 0, 1, 1]))

def test_apply_invert_dimension():
  array1 = random(5)
  array2 = apply(array1, "val2", "~d0")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([-1, -2, -3, -4, -5]))

def test_apply_lshift_dimension_constant():
  array1 = random(5)
  array2 = apply(array1, "val2", "d0 << 2")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([0, 4, 8, 12, 16]))

def test_apply_lt_dimension_constant():
  array1 = random(5)
  array2 = apply(array1, "val2", "d0 < 3")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([1, 1, 1, 0, 0]))

def test_apply_lte_dimension_constant():
  array1 = random(5)
  array2 = apply(array1, "val2", "d0 <= 3")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([1, 1, 1, 1, 0]))

def test_apply_mod_dimension_constant():
  array1 = random(5)
  array2 = apply(array1, "val2", "d0 % 3")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([0, 1, 2, 0, 1]))

def test_apply_mult_dimension_constant():
  array1 = random(5)
  array2 = apply(array1, "val2", "d0 * 2")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([0, 2, 4, 6, 8]))

def test_apply_not_dimension():
  array1 = random(5)
  array2 = apply(array1, "val2", "not d0")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([1, 0, 0, 0, 0]))

def test_apply_pow_dimension_constant():
  array1 = random(5)
  array2 = apply(array1, "val2", "d0 ** 2")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_almost_equal(values(array2, 1), numpy.array([0, 1, 4, 9, 16]))

def test_apply_rshift_dimension_constant():
  array1 = random(5)
  array2 = apply(array1, "val2", "d0 >> 2")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([0, 0, 0, 0, 1]))

def test_apply_sub_dimension_constant():
  array1 = random(5)
  array2 = apply(array1, "val2", "d0 - 4")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([-4, -3, -2, -1, 0]))

def test_apply_uadd_dimension():
  array1 = random(5)
  array2 = apply(array1, "val2", "+d0")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([0, 1, 2, 3, 4]))

def test_apply_usub_dimension():
  array1 = random(5)
  array2 = apply(array1, "val2", "-d0")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([0, -1, -2, -3, -4]))

def test_array_auto_1d():
  array1 = array([1, 2, 3])
  require_array_schema(array1, [("d0", "int64", 0, 3, 3)], [("val", "float64")])
  numpy.testing.assert_array_almost_equal(values(array1), numpy.array([1, 2, 3], dtype="float64"))

def test_array_int64_1d():
  array1 = array([1, 2, 3], "int64")
  require_array_schema(array1, [("d0", "int64", 0, 3, 3)], [("val", "int64")])
  numpy.testing.assert_array_almost_equal(values(array1), numpy.array([1, 2, 3], dtype="int64"))

def test_array_string_1d():
  array1 = array([1, 2, 3], "string")
  require_array_schema(array1, [("d0", "int64", 0, 3, 3)], [("val", "string")])
  numpy.testing.assert_array_equal(values(array1), numpy.array(["1", "2", "3"]))

def test_attributes_1d():
  array1 = zeros(5)
  array2 = attributes(array1)
  require_array_schema(array2, [("i", "int64", 0, 1, 1)], [("name", "string"), ("type", "string")])
  numpy.testing.assert_array_equal(values(array2, 0), numpy.array(["val"], dtype="string"))
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array(["float64"], dtype="string"))

def test_attributes_2d():
  array1 = zeros((5, 4))
  array2 = attributes(array1)
  require_array_schema(array2, [("i", "int64", 0, 1, 1)], [("name", "string"), ("type", "string")])
  numpy.testing.assert_array_equal(values(array2, 0), numpy.array(["val"], dtype="string"))
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array(["float64"], dtype="string"))

def test_attribute_rename():
  array1 = random(5)
  array2 = aggregate(array1, ["min(val)", "avg(val)", "max(val)"])
  array3 = attribute_rename(array2, ("val_min", "a"), ("val_max", "b"))
  require_array_schema(array3, [("i", "int64", 0, 1, 1)], [("a", "float64"), ("val_avg", "float64"), ("b", "float64")])
  numpy.testing.assert_array_almost_equal(value(array3, 0), values(array1).min())
  numpy.testing.assert_array_almost_equal(value(array3, 1), values(array1).mean())
  numpy.testing.assert_array_almost_equal(value(array3, 2), values(array1).max())

def test_chunk_map_10_10():
  array1 = random(10)
  array2 = chunk_map(array1)
  require_array_schema(array2, [("i", "int64", 0, 1, 1)], [("worker", "int64"), ("index", "int64"), ("c0", "int64"), ("s0", "int64")])
  numpy.testing.assert_array_equal(values(array2, 0), numpy.array([0], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([0], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 2), numpy.array([0], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 3), numpy.array([10], dtype="int64"))

def test_chunk_map_10_5():
  array1 = random(10, 5)
  array2 = chunk_map(array1)
  require_array_schema(array2, [("i", "int64", 0, 2, 2)], [("worker", "int64"), ("index", "int64"), ("c0", "int64"), ("s0", "int64")])
  numpy.testing.assert_array_equal(values(array2, 0), numpy.array([0, 1], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([0, 0], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 2), numpy.array([0, 5], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 3), numpy.array([5, 5], dtype="int64"))

def test_chunk_map_10_3():
  array1 = random(10, 3)
  array2 = chunk_map(array1)
  require_array_schema(array2, [("i", "int64", 0, 4, 4)], [("worker", "int64"), ("index", "int64"), ("c0", "int64"), ("s0", "int64")])
  numpy.testing.assert_array_equal(values(array2, 0), numpy.array([0, 1, 2, 3], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([0, 0, 0, 0], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 2), numpy.array([0, 3, 6, 9], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 3), numpy.array([3, 3, 3, 1], dtype="int64"))

def test_chunk_map_10_2():
  array1 = random(10, 2)
  array2 = chunk_map(array1)
  require_array_schema(array2, [("i", "int64", 0, 5, 5)], [("worker", "int64"), ("index", "int64"), ("c0", "int64"), ("s0", "int64")])
  numpy.testing.assert_array_equal(values(array2, 0), numpy.array([0, 0, 1, 2, 3], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([0, 1, 0, 0, 0], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 2), numpy.array([0, 2, 4, 6, 8], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 3), numpy.array([2, 2, 2, 2, 2], dtype="int64"))

def test_chunk_map_10_10_10_10():
  array1 = random((10, 10))
  array2 = chunk_map(array1)
  require_array_schema(array2, [("i", "int64", 0, 1, 1)], [("worker", "int64"), ("index", "int64"), ("c0", "int64"), ("c1", "int64"), ("s0", "int64"), ("s1", "int64")])
  numpy.testing.assert_array_equal(values(array2, 0), numpy.array([0], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([0], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 2), numpy.array([0], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 3), numpy.array([0], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 4), numpy.array([10], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 5), numpy.array([10], dtype="int64"))

def test_chunk_map_10_10_5_5():
  array1 = random((10, 10), (5, 5))
  array2 = chunk_map(array1)
  require_array_schema(array2, [("i", "int64", 0, 4, 4)], [("worker", "int64"), ("index", "int64"), ("c0", "int64"), ("c1", "int64"), ("s0", "int64"), ("s1", "int64")])
  numpy.testing.assert_array_equal(values(array2, 0), numpy.array([0, 1, 2, 3], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([0, 0, 0, 0], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 2), numpy.array([0, 0, 5, 5], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 3), numpy.array([0, 5, 0, 5], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 4), numpy.array([5, 5, 5, 5], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 5), numpy.array([5, 5, 5, 5], dtype="int64"))

def test_dimensions_1d():
  array1 = random(5)
  array2 = dimensions(array1)
  require_array_schema(array2, [("i", "int64", 0, 1, 1)], [("name", "string"), ("type", "string"), ("begin", "int64"), ("end", "int64"), ("chunk-size", "int64")])
  numpy.testing.assert_array_equal(values(array2, 0), numpy.array(["d0"], dtype="string"))
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array(["int64"], dtype="string"))
  numpy.testing.assert_array_almost_equal(values(array2, 2), numpy.array([0], dtype="int64"))
  numpy.testing.assert_array_almost_equal(values(array2, 3), numpy.array([5], dtype="int64"))

def test_dimensions_2d():
  array1 = random((5, 4))
  array2 = dimensions(array1)
  require_array_schema(array2, [("i", "int64", 0, 2, 2)], [("name", "string"), ("type", "string"), ("begin", "int64"), ("end", "int64"), ("chunk-size", "int64")])
  numpy.testing.assert_array_equal(values(array2, 0), numpy.array(["d0", "d1"], dtype="string"))
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array(["int64", "int64"], dtype="string"))
  numpy.testing.assert_array_almost_equal(values(array2, 2), numpy.array([0, 0], dtype="int64"))
  numpy.testing.assert_array_almost_equal(values(array2, 3), numpy.array([5, 4], dtype="int64"))

def test_join():
  array1 = random((5, 4))
  array2 = zeros((5, 4))
  array3 = join(array1, array2)
  require_array_schema(array3, [("d0", "int64", 0, 5, 5), ("d1", "int64", 0, 4, 4)], [("val", "float64"), ("val", "float64")])
  numpy.testing.assert_array_equal(values(array3, 0), values(array1, 0))
  numpy.testing.assert_array_equal(values(array3, 1), values(array2, 0))

def test_load_csv_unformatted():
  array1 = load("../data/automobiles.csv", schema="csv-file", chunk_size=100)
  array2 = chunk_map(array1)
  assert(array1.file_path() == "../data/automobiles.csv")
  assert(array1.file_size() == 17314)
  require_array_schema(array1, [("i", "int64", 0, 406, 100)], [("Model", "string"), ("Origin", "string"), ("Year", "string"), ("Cylinders", "string"), ("Acceleration", "string"), ("Displacement", "string"), ("Horsepower", "string"), ("MPG", "string")])
  require_array_schema(array2, [("i", "int64", 0, 5, 5)], [("worker", "int64"), ("index", "int64"), ("c0", "int64"), ("s0", "int64")])
  numpy.testing.assert_array_equal(values(array2, 0), numpy.array([0, 0, 1, 2, 3], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([0, 1, 0, 0, 0], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 2), numpy.array([0, 400, 100, 200, 300], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 3), numpy.array([100, 6, 100, 100, 100], dtype="int64"))
  numpy.testing.assert_array_equal(values(array1, 0)[:2], numpy.array(["chevrolet chevelle malibu", "buick skylark 320"]))
  numpy.testing.assert_array_equal(values(array1, 1)[:2], numpy.array(["USA", "USA"]))
  numpy.testing.assert_array_equal(values(array1, 2)[:2], numpy.array(["70", "70"]))
  numpy.testing.assert_array_equal(values(array1, 3)[:2], numpy.array(["8", "8"]))
  numpy.testing.assert_array_equal(values(array1, 4)[:2], numpy.array(["12", "11.5"]))
  numpy.testing.assert_array_equal(values(array1, 5)[:2], numpy.array(["307", "350"]))
  numpy.testing.assert_array_equal(values(array1, 6)[:2], numpy.array(["130", "165"]))
  numpy.testing.assert_array_equal(values(array1, 7)[:2], numpy.array(["18", "15"]))

def test_load_csv_formatted():
  array1 = load("../data/automobiles.csv", schema="csv-file", chunk_size=100, format=["string", "string", "int64", "int64", "float64", "float64", "float64", "float64"])
  array2 = chunk_map(array1)
  assert(array1.file_path() == "../data/automobiles.csv")
  assert(array1.file_size() == 17314)
  require_array_schema(array1, [("i", "int64", 0, 406, 100)], [("Model", "string"), ("Origin", "string"), ("Year", "int64"), ("Cylinders", "int64"), ("Acceleration", "float64"), ("Displacement", "float64"), ("Horsepower", "float64"), ("MPG", "float64")])
  require_array_schema(array2, [("i", "int64", 0, 5, 5)], [("worker", "int64"), ("index", "int64"), ("c0", "int64"), ("s0", "int64")])
  numpy.testing.assert_array_equal(values(array2, 0), numpy.array([0, 0, 1, 2, 3], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 1), numpy.array([0, 1, 0, 0, 0], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 2), numpy.array([0, 400, 100, 200, 300], dtype="int64"))
  numpy.testing.assert_array_equal(values(array2, 3), numpy.array([100, 6, 100, 100, 100], dtype="int64"))
  numpy.testing.assert_array_equal(values(array1, 0)[:2], numpy.array(["chevrolet chevelle malibu", "buick skylark 320"]))
  numpy.testing.assert_array_equal(values(array1, 1)[:2], numpy.array(["USA", "USA"]))
  numpy.testing.assert_array_equal(values(array1, 2)[:2], numpy.array([70, 70], dtype="int64"))
  numpy.testing.assert_array_equal(values(array1, 3)[:2], numpy.array([8, 8], dtype="int64"))
  numpy.testing.assert_array_equal(values(array1, 4)[:2], numpy.array([12, 11.5], dtype="float64"))
  numpy.testing.assert_array_equal(values(array1, 5)[:2], numpy.array([307, 350], dtype="float64"))
  numpy.testing.assert_array_equal(values(array1, 6)[:2], numpy.array([130, 165], dtype="float64"))
  numpy.testing.assert_array_equal(values(array1, 7)[:2], numpy.array([18, 15], dtype="float64"))

def test_materialize():
  array1 = random((5, 5))
  array2 = materialize(array1)
  assert(array2.dimensions == array1.dimensions)
  assert(array2.attributes == array1.attributes)
  numpy.testing.assert_array_equal(values(array2, 0), values(array1, 0))

def test_project_by_index():
  array1 = random(5)
  array2 = aggregate(array1, ["min(val)", "avg(val)", "max(val)"])
  array3 = project(array2, 2, 0)
  require_array_schema(array3, [("i", "int64", 0, 1, 1)], [("val_max", "float64"), ("val_min", "float64")])
  numpy.testing.assert_array_almost_equal(value(array3, 0), values(array1).max())
  numpy.testing.assert_array_almost_equal(value(array3, 1), values(array1).min())

def test_project_by_name():
  array1 = random(5)
  array2 = aggregate(array1, ["min(val)", "avg(val)", "max(val)"])
  array3 = project(array2, "val_max")
  require_array_schema(array3, [("i", "int64", 0, 1, 1)], [("val_max", "float64")])
  numpy.testing.assert_array_almost_equal(value(array3, 0), values(array1).max())

def test_random_1d():
  array1 = random(5)
  require_array_schema(array1, [("d0", "int64", 0, 5, 5)], [("val", "float64")])

def test_random_2d():
  array1 = random((5, 4))
  require_array_schema(array1, [("d0", "int64", 0, 5, 5), ("d1", "int64", 0, 4, 4)], [("val", "float64")])

def test_random_values_consistency():
  array1 = random(10, 5)
  values1 = values(array1, 0)
  values2 = values(array1, 0)
  numpy.testing.assert_array_equal(values1, values2)

def test_random_chunk_consistency():
  array1 = random(10, 5)
  for chunk in array1.chunks():
    values1 = chunk.values(0)
    values2 = chunk.values(0)
    numpy.testing.assert_array_equal(values1, values2)

def test_redimension_attribute_attribute():
  array1 = random((4, 4), (2, 2))
  array2 = apply(array1, "val2", "val * val")
  array3 = apply(array2, "val3", "val * val * val")
  array4 = redimension(array3, ["d0", "d1"], ["val3", "val"])
  require_array_schema(array4, [("d0", "int64", 0, 4, 2), ("d1", "int64", 0, 4, 2)], [("val3", "float64"), ("val", "float64")])
  #numpy.testing.assert_array_almost_equal(values(array4, 0), values(array3, 2))
  #numpy.testing.assert_array_almost_equal(values(array4, 1), values(array1, 0))

def test_redimension_dimension_attribute():
  array1 = random((4, 4), (2, 2))
  array2 = redimension(array1, ["d0", "d1"], ["val", "d0", "d1"])
  require_array_schema(array2, [("d0", "int64", 0, 4, 2), ("d1", "int64", 0, 4, 2)], [("val", "float64"), ("d0", "int64"), ("d1", "int64")])
  #numpy.testing.assert_array_almost_equal(values(array2, 0), values(array1, 0))
  #numpy.testing.assert_array_equal(values(array2, 1), numpy.array([[0, 0, 0, 0], [1, 1, 1, 1], [2, 2, 2, 2], [3, 3, 3, 3]], dtype="int64"))
  #numpy.testing.assert_array_equal(values(array2, 2), numpy.array([[0, 1, 2, 3], [0, 1, 2, 3], [0, 1, 2, 3], [0, 1, 2, 3]], dtype="int64"))

def test_redimension_dimension_dimension():
  array1 = random((4, 4), (2, 2))
  array2 = redimension(array1, ["d0"], ["val"])
  require_array_schema(array2, [("d0", "int64", 0, 4, 2)], [("val", "float64")])

def test_redimension_attribute_dimension():
  array1 = random((4), (2))
  array2 = apply(array1, ("j", "int64"), "d0 % 2")
  array3 = redimension(array2, ["d0", "j"], ["val"])
  require_array_schema(array3, [("d0", "int64", 0, 4, 2), ("j", "int64", 0, 2, 2)], [("val", "float64")])

def test_scan_csv():
  array1 = random(5)
  scan(array1, format="csv")

def test_scan_csvp():
  array1 = random(5)
  scan(array1, format="csv+")

def test_scan_dcsv():
  array1 = random(5)
  scan(array1, format="dcsv")

def test_scan_null():
  array1 = random(5)
  scan(array1, format="null")

def test_zeros_1d():
  array1 = zeros(5)
  require_array_schema(array1, [("d0", "int64", 0, 5, 5)], [("val", "float64")])
  numpy.testing.assert_array_almost_equal(values(array1), numpy.zeros((5), dtype="float64"))

def test_zeros_2d():
  array1 = zeros((5, 4))
  require_array_schema(array1, [("d0", "int64", 0, 5, 5), ("d1", "int64", 0, 4, 4)], [("val", "float64")])
  numpy.testing.assert_array_almost_equal(values(array1), numpy.zeros((5, 4), dtype="float64"))

def test_timeseries_model():
  array = load("/home/slycat/Documents/XyceBrette-250/workdir.1/circuit.cir.prn", schema="prn-file", chunk_size=10000)
  bin_count = 100
  time_min = value(aggregate(array, ["min(TIME)"]))
  time_max = value(aggregate(array, ["max(TIME)"]))
  bin_size = (time_max - time_min) / bin_count
  scan(apply(project(array, "Index", "TIME", 2, 3, 4, 5), ("bin", "int64"), "(TIME - %s) / %s" % (time_min, bin_size)))

