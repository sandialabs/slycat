import nose.tools
import numpy.testing

import slycat.cca
import slycat.darray
import slycat.table

def assert_table(array, dimensions, attributes, data=None):
  nose.tools.assert_is_instance(array, slycat.darray.prototype)
  nose.tools.assert_equal(array.dimensions, dimensions)
  nose.tools.assert_equal(array.attributes, attributes)
  if data is not None:
    for attribute, b in enumerate(data):
      numpy.testing.assert_array_equal(array.get(attribute), b)

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
  data = "a,b,c\n1,2,3\n4,nan,six\n7,8,9"
  array = slycat.table.parse(data)
  assert_table(array, [{"name":"row", "type":"int64", "begin":0, "end":3}], [{"name":"a", "type":"float64"}, {"name":"b", "type":"float64"}, {"name":"c", "type":"string"}], [[1, 4, 7], [2, numpy.nan, 8], ["3", "six", "9"]])

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
