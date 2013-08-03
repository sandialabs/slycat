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
  array2 = aggregate(array1, "avg")
  require_array_schema(array2, [("i", "int64", 0, 1, 1)], [("avg_val", "float64")])
  numpy.testing.assert_array_almost_equal(value(array2), values(array1).mean())

def test_aggregate_count():
  array1 = random(5, 3)
  array2 = aggregate(array1, "count")
  require_array_schema(array2, [("i", "int64", 0, 1, 1)], [("count_val", "float64")])
  numpy.testing.assert_array_almost_equal(value(array2), values(array1).size)

def test_aggregate_distinct():
  array1 = array(numpy.array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 14]).reshape((4, 4)))
  array2 = aggregate(array1, "distinct")
  require_array_schema(array2, [("i", "int64", 0, 1, 1)], [("distinct_val", "float64")])
  numpy.testing.assert_array_equal(value(array2), [15])

def test_aggregate_max():
  array1 = random(5, 3)
  array2 = aggregate(array1, "max")
  require_array_schema(array2, [("i", "int64", 0, 1, 1)], [("max_val", "float64")])
  numpy.testing.assert_array_almost_equal(value(array2), values(array1).max())

def test_aggregate_max_2():
  array1 = random(50, 10)
  array2 = aggregate(array1, "max")
  require_array_schema(array2, [("i", "int64", 0, 1, 1)], [("max_val", "float64")])
  numpy.testing.assert_array_almost_equal(value(array2), values(array1).max())

def test_aggregate_min():
  array1 = random(5, 3)
  array2 = aggregate(array1, "min")
  require_array_schema(array2, [("i", "int64", 0, 1, 1)], [("min_val", "float64")])
  numpy.testing.assert_array_almost_equal(value(array2), values(array1).min())

def test_aggregate_sum():
  array1 = random(5, 3)
  array2 = aggregate(array1, "sum")
  require_array_schema(array2, [("i", "int64", 0, 1, 1)], [("sum_val", "float64")])
  numpy.testing.assert_array_almost_equal(value(array2), values(array1).sum())

def test_aggregate_multiple():
  array1 = random(5, 3)
  array2 = aggregate(array1, ["min", "avg", "max"])
  require_array_schema(array2, [("i", "int64", 0, 1, 1)], [("min_val", "float64"), ("avg_val", "float64"), ("max_val", "float64")])
  numpy.testing.assert_array_almost_equal(value(array2, 0), values(array1).min())
  numpy.testing.assert_array_almost_equal(value(array2, 1), values(array1).mean())
  numpy.testing.assert_array_almost_equal(value(array2, 2), values(array1).max())

def test_aggregate_individual():
  array1 = random(5, attributes=["a", "b", "c"])
  array2 = aggregate(array1, [("min", "a"), ("avg", 1), ("max", "c")])
  require_array_schema(array2, [("i", "int64", 0, 1, 1)], [("min_a", "float64"), ("avg_b", "float64"), ("max_c", "float64")])
  numpy.testing.assert_array_almost_equal(value(array2, 0), values(array1, "a").min())
  numpy.testing.assert_array_almost_equal(value(array2, 1), values(array1, "b").mean())
  numpy.testing.assert_array_almost_equal(value(array2, 2), values(array1, "c").max())

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
  numpy.testing.assert_array_equal(values(array1), numpy.array([1, 2, 3], dtype="float64"))

def test_array_int64_1d():
  array1 = array([1, 2, 3], ("myint", "int64"))
  require_array_schema(array1, [("d0", "int64", 0, 3, 3)], [("myint", "int64")])
  numpy.testing.assert_array_equal(values(array1), numpy.array([1, 2, 3], dtype="int64"))

def test_array_string_1d():
  array1 = array([1, 2, 3], ("mystring", "string"))
  require_array_schema(array1, [("d0", "int64", 0, 3, 3)], [("mystring", "string")])
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

def test_build_1():
  array1 = build(5, ("val", "d0"))
  require_array_schema(array1, [("d0", "int64", 0, 5, 5)], [("val", "float64")])
  numpy.testing.assert_array_equal(values(array1, 0), numpy.array(range(5), dtype="float64"))

def test_build_2():
  array1 = build(5, [("val", "d0"), ("val2", "d0 ** 2")])
  require_array_schema(array1, [("d0", "int64", 0, 5, 5)], [("val", "float64"), ("val2", "float64")])
  numpy.testing.assert_array_equal(values(array1, 0), numpy.array(range(5), dtype="float64"))
  numpy.testing.assert_array_equal(values(array1, 1), numpy.array(range(5), dtype="float64") ** 2)

def test_build_2_int():
  array1 = build(5, [(("val", "int64"), "d0"), (("val2", "int64"), "d0 ** 2")])
  require_array_schema(array1, [("d0", "int64", 0, 5, 5)], [("val", "int64"), ("val2", "int64")])
  numpy.testing.assert_array_equal(values(array1, 0), numpy.array(range(5), dtype="int64"))
  numpy.testing.assert_array_equal(values(array1, 1), numpy.array(range(5), dtype="int64") ** 2)

def test_cca():
  from slycat.web.server.cca import cca
  autos = load("../data/automobiles.csv", "csv-file", chunk_size=100)
  inputs = project(autos, "Year", "Cylinders", "Displacement")
  outputs = project(autos, "Acceleration", "MPG", "Horsepower")
  X = numpy.column_stack(values(inputs)).astype("double")
  Y = numpy.column_stack(values(outputs)).astype("double")
  good = ~numpy.isnan(Y).any(axis=1)
  X = X[good]
  Y = Y[good]

  x, y, x_loadings, y_loadings, r, wilks = cca(X, Y)

  sys.stderr.write("\n")
  sys.stderr.write("x: {}\n".format(x))
  sys.stderr.write("y: {}\n".format(y))
  sys.stderr.write("x-loadings: {}\n".format(x_loadings))
  sys.stderr.write("y-loadings: {}\n".format(y_loadings))
  sys.stderr.write("r: {}\n".format(r))
  sys.stderr.write("wilks: {}\n".format(wilks))

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
  array1 = random(5, attributes=["a", "b", "c"])
  array2 = project(array1, 2, 0)
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("c", "float64"), ("a", "float64")])
  numpy.testing.assert_array_equal(values(array2, 0), values(array1, 2))
  numpy.testing.assert_array_equal(values(array2, 1), values(array1, 0))

def test_project_by_name():
  array1 = random(5, attributes=["a", "b", "c"])
  array2 = project(array1, "b")
  require_array_schema(array2, [("d0", "int64", 0, 5, 5)], [("b", "float64")])
  numpy.testing.assert_array_equal(values(array2, 0), values(array1, 1))

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

def test_rename_by_name():
  array1 = random((5, 5), attributes=["a", "b", "c"])
  array2 = rename(array1, dimensions=("d0", "i"), attributes=("c", "d"))
  require_array_schema(array2, [("i", "int64", 0, 5, 5), ("d1", "int64", 0, 5, 5)], [("a", "float64"), ("b", "float64"), ("d", "float64")])
  numpy.testing.assert_array_equal(values(array2, "d"), values(array1, "c"))

def test_rename_by_index():
  array1 = random((5, 5), attributes=["a", "b", "c"])
  array2 = rename(array1, dimensions=(1, "j"), attributes=(1, "d"))
  require_array_schema(array2, [("d0", "int64", 0, 5, 5), ("j", "int64", 0, 5, 5)], [("a", "float64"), ("d", "float64"), ("c", "float64")])
  numpy.testing.assert_array_equal(values(array2, "d"), values(array1, "b"))

def test_rename_multiple_dict():
  array1 = random((5, 5), attributes=["a", "b", "c"])
  array2 = rename(array1, dimensions={0:"i","d1":"j"}, attributes={0:"d", "c":"e"})
  require_array_schema(array2, [("i", "int64", 0, 5, 5), ("j", "int64", 0, 5, 5)], [("d", "float64"), ("b", "float64"), ("e", "float64")])
  numpy.testing.assert_array_equal(values(array2, "d"), values(array1, "a"))
  numpy.testing.assert_array_equal(values(array2, "e"), values(array1, "c"))

def test_rename_multiple_list():
  array1 = random((5, 5), attributes=["a", "b", "c"])
  array2 = rename(array1, dimensions=[(0,"i"),("d1","j")], attributes=[(0,"d"), ("c","e")])
  require_array_schema(array2, [("i", "int64", 0, 5, 5), ("j", "int64", 0, 5, 5)], [("d", "float64"), ("b", "float64"), ("e", "float64")])
  numpy.testing.assert_array_equal(values(array2, "d"), values(array1, "a"))
  numpy.testing.assert_array_equal(values(array2, "e"), values(array1, "c"))

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

def test_value_default():
  array1 = random(5, attributes=["foo", "bar"])
  numpy.testing.assert_equal(len(value(array1)), 2)
  numpy.testing.assert_equal(value(array1)[0], values(array1, 0)[0])
  numpy.testing.assert_equal(value(array1)[1], values(array1, 1)[0])

def test_value_index_name():
  array1 = random(5, attributes=["foo", "bar"])
  numpy.testing.assert_equal(value(array1, "foo"), value(array1, 0))
  numpy.testing.assert_equal(value(array1, "bar"), value(array1, 1))

def test_value_indexes():
  array1 = random(5, attributes=["foo", "bar"])
  numpy.testing.assert_equal(value(array1, [1, 0])[0], value(array1, 1))
  numpy.testing.assert_equal(value(array1, [1, 0])[1], value(array1, 0))

def test_value_names():
  array1 = random(5, attributes=["foo", "bar"])
  numpy.testing.assert_equal(value(array1, ["bar", "foo"])[0], value(array1, 1))
  numpy.testing.assert_equal(value(array1, ["bar", "foo"])[1], value(array1, 0))

def test_value_2d():
  array1 = random((4, 4))
  numpy.testing.assert_equal(value(array1), values(array1)[0, 0])

def test_values_default():
  array1 = random(5, attributes=["foo", "bar"])
  numpy.testing.assert_equal(len(values(array1)), 2)
  numpy.testing.assert_array_equal(values(array1)[0], values(array1, 0))
  numpy.testing.assert_array_equal(values(array1)[1], values(array1, 1))

def test_values_index_name():
  array1 = random(5, attributes=["foo", "bar"])
  numpy.testing.assert_array_equal(values(array1, "foo"), values(array1, 0))
  numpy.testing.assert_array_equal(values(array1, "bar"), values(array1, 1))

def test_values_indexes():
  array1 = random(5, attributes=["foo", "bar"])
  numpy.testing.assert_array_equal(values(array1, [1, 0])[0], values(array1, 1))
  numpy.testing.assert_array_equal(values(array1, [1, 0])[1], values(array1, 0))

def test_values_names():
  array1 = random(5, attributes=["foo", "bar"])
  numpy.testing.assert_array_equal(values(array1, ["bar", "foo"])[0], values(array1, 1))
  numpy.testing.assert_array_equal(values(array1, ["bar", "foo"])[1], values(array1, 0))

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
  time_min = value(aggregate(array, ("min", "TIME")))
  time_max = value(aggregate(array, ("max", "TIME")))
  bin_size = (time_max - time_min) / bin_count
  scan(apply(project(array, "Index", "TIME", 2, 3, 4, 5), ("bin", "int64"), "(TIME - %s) / %s" % (time_min, bin_size)))

