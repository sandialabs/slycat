# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import h5py
import nose.tools
import numpy.testing
import os
import tempfile

import slycat.cca
import slycat.darray
import slycat.hdf5
import slycat.table

########################################################################################################
# Helper functions.

def assert_table(array, dimensions, attributes, data=None):
  """Test a darray to see that it conforms to a table data structure."""
  nose.tools.assert_is_instance(array, slycat.darray.Prototype)
  nose.tools.assert_equal(array.dimensions, dimensions)
  nose.tools.assert_equal(array.attributes, attributes)
  if data is not None:
    for attribute, b in enumerate(data):
      numpy.testing.assert_array_equal(array.get_data(attribute), b)

########################################################################################################
# slycat.cca tests

def test_slycat_cca_cca_preconditions():
  with nose.tools.assert_raises_regexp(TypeError, "X and Y must be numpy.ndarray instances."):
    slycat.cca.cca([], [])
  with nose.tools.assert_raises_regexp(ValueError, "X and Y must have two dimensions."):
    slycat.cca.cca(numpy.random.random(10), numpy.random.random(10))
  with nose.tools.assert_raises_regexp(ValueError, "X and Y must contain the same number of rows."):
    slycat.cca.cca(numpy.random.random((10, 4)), numpy.random.random((11, 3)))
  with nose.tools.assert_raises_regexp(ValueError, "Number of rows must be greater-than the number of columns."):
    slycat.cca.cca(numpy.random.random((1, 4)), numpy.random.random((1, 3)))
  with nose.tools.assert_raises_regexp(ValueError, "X and Y must contain one-or-more columns."):
    slycat.cca.cca(numpy.random.random((10, 0)), numpy.random.random((10, 0)))
  with nose.tools.assert_raises_regexp(ValueError, "Columns in X and Y cannot be constant."):
    slycat.cca.cca(numpy.zeros((10, 4)), numpy.ones((10, 3)))
  with nose.tools.assert_raises_regexp(TypeError, "scale_inputs must be a boolean."):
    slycat.cca.cca(numpy.random.random((10, 4)), numpy.random.random((10, 3)), scale_inputs=3)
  with nose.tools.assert_raises_regexp(TypeError, "force_positive must be an integer or None."):
    slycat.cca.cca(numpy.random.random((10, 4)), numpy.random.random((10, 3)), force_positive=3.4)
  with nose.tools.assert_raises_regexp(ValueError, "force_positive must be in the range \[0, number of Y columns\)."):
    slycat.cca.cca(numpy.random.random((10, 4)), numpy.random.random((10, 3)), force_positive=5)
  with nose.tools.assert_raises_regexp(TypeError, "significant_digits must be an integer or None."):
    slycat.cca.cca(numpy.random.random((10, 4)), numpy.random.random((10, 3)), significant_digits=3.4)

########################################################################################################
# slycat.darray tests

def test_slycat_darray_memarray_zero_dimensions():
  with nose.tools.assert_raises_regexp(ValueError, "At least one dimension is required."):
    slycat.darray.MemArray([], [], [])

def test_slycat_darray_memarray_one_based_dimension():
  with nose.tools.assert_raises_regexp(ValueError, "Dimension range must begin with 0."):
    slycat.darray.MemArray([dict(name="i", begin=1, end=5)], [dict(name="val", type="float64")], [numpy.random.random(4)])

def test_slycat_darray_memarray_zero_attributes():
  with nose.tools.assert_raises_regexp(ValueError, "At least one attribute is required."):
    slycat.darray.MemArray([dict(name="i", end=4)], [], [])

def test_slycat_darray_memarray_zero_data():
  with nose.tools.assert_raises_regexp(ValueError, "Attribute and data counts must match."):
    slycat.darray.MemArray([dict(name="i", end=4)], [dict(name="val", type="float64")], [])

def test_slycat_darray_memarray_misshapen_data():
  with nose.tools.assert_raises_regexp(ValueError, "Attribute data must match array shape."):
    slycat.darray.MemArray([dict(name="i", end=4)], [dict(name="val", type="float64")], [numpy.random.random(5)])
  with nose.tools.assert_raises_regexp(ValueError, "Attribute data must match array shape."):
    slycat.darray.MemArray([dict(name="i", end=4)], [dict(name="val", type="float64")], [numpy.random.random((4, 1))])

def test_slycat_darray_memarray_basic():
  array = slycat.darray.MemArray([dict(name="i", end=4), dict(name="j", end=3)], [dict(name="val", type="float64"), dict(name="val2", type="float64")], [numpy.arange(12).reshape((4, 3)), numpy.zeros((4, 3))])
  nose.tools.assert_equal(array.ndim, 2)
  nose.tools.assert_equal(array.shape, (4, 3))
  nose.tools.assert_equal(array.size, 12)
  numpy.testing.assert_array_equal(array.get_data(), [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11]])
  numpy.testing.assert_array_equal(array.get_data(1), numpy.zeros((4, 3)))
  numpy.testing.assert_array_equal(array.get_data(1)[0:2,0:2], numpy.zeros((2, 2)))
  array.set_data(1, [slice(0, 2), slice(0, 2)], numpy.ones((2, 2)))
  numpy.testing.assert_array_equal(array.get_data(1)[0], [1, 1, 0])
  nose.tools.assert_equal(array.get_statistics(0)["min"], 0)
  nose.tools.assert_equal(array.get_statistics(0)["max"], 11)
  nose.tools.assert_equal(array.get_statistics(1)["min"], 0)
  nose.tools.assert_equal(array.get_statistics(1)["max"], 1)

def test_slycat_darray_memarray_string():
  array = slycat.darray.MemArray([dict(name="i", end=4)], [dict(name="val", type="string")], [["a", "b", "foo", "d"]])
  nose.tools.assert_equal(array.ndim, 1)
  nose.tools.assert_equal(array.shape, (4,))
  nose.tools.assert_equal(array.size, 4)
  numpy.testing.assert_array_equal(array.get_data(), ["a", "b", "foo", "d"])
  nose.tools.assert_equal(array.get_statistics(0)["min"], "a")
  nose.tools.assert_equal(array.get_statistics(0)["max"], "foo")

def test_slycat_darray_memarray_nan_statistics():
  array = slycat.darray.MemArray([dict(name="i", end=4)], [dict(name="val", type="float64")], [[1, 2, numpy.nan, 5]])
  nose.tools.assert_equal(array.get_statistics(0)["min"], 1)
  nose.tools.assert_equal(array.get_statistics(0)["max"], 5)

def test_slycat_darray_memarray_empty_statistics():
  array = slycat.darray.MemArray([dict(name="i", end=4)], [dict(name="val", type="float64")], [[numpy.nan, numpy.nan, numpy.nan, numpy.nan]])
  nose.tools.assert_equal(array.get_statistics(0)["min"], None)
  nose.tools.assert_equal(array.get_statistics(0)["max"], None)

########################################################################################################
# slycat.hdf5 tests

def test_slycat_hdf5_array_basic():
  with h5py.File(os.path.join(tempfile.mkdtemp(), "test.hdf5"), "w") as file:
    arrayset = slycat.hdf5.start_arrayset(file)
    nose.tools.assert_equal(len(arrayset), 0)
    nose.tools.assert_equal(arrayset.keys(), [])

    array = arrayset.start_array(1, [dict(name="i", end=4)], [dict(name="a", type="float64"), dict(name="b", type="string")])
    nose.tools.assert_equal(len(arrayset), 1)
    nose.tools.assert_equal(arrayset.keys(), [1])
    nose.tools.assert_equal(array.ndim, 1)
    nose.tools.assert_equal(array.shape, (4,))
    nose.tools.assert_equal(array.size, 4)
    nose.tools.assert_equal(array.dimensions, [{"name":"i", "type":"int64", "begin":0, "end":4}])
    nose.tools.assert_equal(array.attributes, [{"name":"a", "type":"float64"}, {"name":"b", "type":"string"}])
    nose.tools.assert_equal(array.get_statistics(0), {"min":0, "max":0})
    nose.tools.assert_equal(array.get_statistics(1), {"min":"", "max":""})

    array = arrayset[1]
    nose.tools.assert_equal(array.ndim, 1)
    nose.tools.assert_equal(array.shape, (4,))
    nose.tools.assert_equal(array.size, 4)
    nose.tools.assert_equal(array.dimensions, [{"name":"i", "type":"int64", "begin":0, "end":4}])
    nose.tools.assert_equal(array.attributes, [{"name":"a", "type":"float64"}, {"name":"b", "type":"string"}])
    nose.tools.assert_equal(array.get_statistics(0), {"min":0, "max":0})
    nose.tools.assert_equal(array.get_statistics(1), {"min":"", "max":""})

    array.set_data(0, slice(0, 4), numpy.arange(2, 6))
    array.set_data(1, slice(0, 4), numpy.array(["foo", "bar", "baz", "blah"]))
    numpy.testing.assert_array_equal(array.get_data(0), [2, 3, 4, 5])
    numpy.testing.assert_array_equal(array.get_data(1), ["foo", "bar", "baz", "blah"])
    nose.tools.assert_equal(array.get_statistics(0), {"min":2, "max":5})
    nose.tools.assert_equal(array.get_statistics(1), {"min":"bar", "max":"foo"})

def test_slycat_hdf5_array_incremental_stats():
  with h5py.File(os.path.join(tempfile.mkdtemp(), "test.hdf5"), "w") as file:
    arrayset = slycat.hdf5.start_arrayset(file)
    array = arrayset.start_array(0, [dict(name="i", end=4)], [dict(name="a", type="float64")])

    array.set_data(0, slice(0, 2), numpy.array([1, 5]))
    array.set_data(0, slice(2, 4), numpy.array([2, 6]))
    numpy.testing.assert_array_equal(array.get_data(0), [1, 5, 2, 6])
    nose.tools.assert_equal(array.get_statistics(0), {"min":1, "max":6})

def test_slycat_hdf5_array_nan_stats():
  with h5py.File(os.path.join(tempfile.mkdtemp(), "test.hdf5"), "w") as file:
    arrayset = slycat.hdf5.start_arrayset(file)
    array = arrayset.start_array(0, [dict(name="i", end=4)], [dict(name="a", type="float64")])

    array.set_data(0, slice(0, 4), numpy.array([1, numpy.nan, 5, 3]))
    numpy.testing.assert_array_equal(array.get_data(0), [1, numpy.nan, 5, 3])
    nose.tools.assert_equal(array.get_statistics(0), {"min":1, "max":5})

def test_slycat_hdf5_array_all_nan_stats():
  with h5py.File(os.path.join(tempfile.mkdtemp(), "test.hdf5"), "w") as file:
    arrayset = slycat.hdf5.start_arrayset(file)
    array = arrayset.start_array(0, [dict(name="i", end=4)], [dict(name="a", type="float64")])

    array.set_data(0, slice(0, 4), numpy.repeat(numpy.nan, 4))
    numpy.testing.assert_array_equal(array.get_data(0), [numpy.nan, numpy.nan, numpy.nan, numpy.nan])
    nose.tools.assert_equal(array.get_statistics(0), {"min":None, "max":None})

########################################################################################################
# slycat.table tests

def test_slycat_table_parse_basic():
  def basic_table_parse(row_delimiter, field_delimiter, terminate):
    rows = [["a", "b", "c"], [1, 2, 3], [4, 5, "six"], [7, 8, 9]]
    data = row_delimiter.join([field_delimiter.join([str(value) for value in row]) for row in rows]) + (row_delimiter if terminate else "")
    array = slycat.table.parse(data)
    assert_table(array, [{"name":"row", "type":"int64", "begin":0, "end":3}], [{"name":"a", "type":"float64"}, {"name":"b", "type":"float64"}, {"name":"c", "type":"string"}], [[1, 4, 7], [2, 5, 8], ["3", "six", "9"]])

  for row_delimiter in ["\r", "\n", "\r\n"]:
    for field_delimiter in [",", "\t"]:
      for terminate in [True, False]:
        yield basic_table_parse, row_delimiter, field_delimiter, terminate

def test_slycat_table_parse_unknown_row_delimiter():
  data = "a,b|1,2|3,4"
  with nose.tools.assert_raises_regexp(ValueError, "Delimited text file must contain CR, LF, or CRLF row delimiters."):
    slycat.table.parse(data)

def test_slycat_table_parse_unknown_field_delimiter():
  data = "a|b\n1|2\n3|4"
  with nose.tools.assert_raises_regexp(ValueError, "Delimited text file must contain consistent comma or tab field delimiters."):
    slycat.table.parse(data)

def test_slycat_table_parse_empty_string_field():
  data = "a,b,c\n1,2,3\n4,5,six\n7,8,"
  array = slycat.table.parse(data)
  assert_table(array, [{"name":"row", "type":"int64", "begin":0, "end":3}], [{"name":"a", "type":"float64"}, {"name":"b", "type":"float64"}, {"name":"c", "type":"string"}], [[1, 4, 7], [2, 5, 8], ["3", "six", ""]])

def test_slycat_table_parse_nan_numeric_field():
  def basic_nan_parse(nan):
    data = "a,b,c\n1,2,3\n4,%s,six\n7,8,9" % nan
    array = slycat.table.parse(data)
    assert_table(array, [{"name":"row", "type":"int64", "begin":0, "end":3}], [{"name":"a", "type":"float64"}, {"name":"b", "type":"float64"}, {"name":"c", "type":"string"}], [[1, 4, 7], [2, numpy.nan, 8], ["3", "six", "9"]])

  for nan in ["nan", "Nan", "NaN", "NAN"]:
    yield basic_nan_parse, nan

def test_slycat_table_parse_cars():
  data = open("data/cars.csv", "r").read()
  array = slycat.table.parse(data)
  assert_table(array, [{"name":"row", "type":"int64", "begin":0, "end":406}], [
    {"name":"Model", "type":"string"},
    {"name":"MPG", "type":"float64"},
    {"name":"Cylinders", "type":"float64"},
    {"name":"Displacement", "type":"float64"},
    {"name":"Horsepower", "type":"float64"},
    {"name":"Weight", "type":"float64"},
    {"name":"Acceleration", "type":"float64"},
    {"name":"Year", "type":"float64"},
    {"name":"Origin", "type":"float64"},
    ])
