import ast
import numpy
import scipy.constants

from slycat.analysis.worker.expression import evaluator

def test_add():
  numpy.testing.assert_equal(evaluator().evaluate(ast.parse("2+3")), 5)

def test_bitand():
  numpy.testing.assert_equal(evaluator().evaluate(ast.parse("2 & 3")), 2)

def test_bitor():
  numpy.testing.assert_equal(evaluator().evaluate(ast.parse("2 | 3")), 3)

def test_bitxor():
  numpy.testing.assert_equal(evaluator().evaluate(ast.parse("2 ^ 3")), 1)

def test_div():
  numpy.testing.assert_almost_equal(evaluator().evaluate(ast.parse("2/3")), 2.0/3.0)

def test_floordiv():
  numpy.testing.assert_equal(evaluator().evaluate(ast.parse("2//3")), 0)

def test_eq():
  numpy.testing.assert_equal(evaluator().evaluate(ast.parse("2 == 3")), False)

def test_gt():
  numpy.testing.assert_equal(evaluator().evaluate(ast.parse("2 > 3")), False)

def test_gte():
  numpy.testing.assert_equal(evaluator().evaluate(ast.parse("2 >= 3")), False)

def test_invert():
  numpy.testing.assert_equal(evaluator().evaluate(ast.parse("~1")), -2)

def test_lshift():
  numpy.testing.assert_equal(evaluator().evaluate(ast.parse("2 << 1")), 4)

def test_lt():
  numpy.testing.assert_equal(evaluator().evaluate(ast.parse("2 < 3")), True)

def test_lte():
  numpy.testing.assert_equal(evaluator().evaluate(ast.parse("2 <= 3")), True)

def test_mod():
  numpy.testing.assert_equal(evaluator().evaluate(ast.parse("2 % 3")), 2)

def test_mult():
  numpy.testing.assert_equal(evaluator().evaluate(ast.parse("2*3")), 6)

def test_not():
  numpy.testing.assert_equal(evaluator().evaluate(ast.parse("not 1")), 0)

def test_pow():
  numpy.testing.assert_equal(evaluator().evaluate(ast.parse("2**3")), 8)

def test_rshift():
  numpy.testing.assert_equal(evaluator().evaluate(ast.parse("8 >> 1")), 4)

def test_sub():
  numpy.testing.assert_equal(evaluator().evaluate(ast.parse("2 - 3")), -1)

def test_uadd():
  numpy.testing.assert_equal(evaluator().evaluate(ast.parse("+(2+3)")), 5)

def test_usub():
  numpy.testing.assert_equal(evaluator().evaluate(ast.parse("-(2+3)")), -5)

def test_expr_1():
  numpy.testing.assert_equal(evaluator().evaluate(ast.parse("1+2*3")), 7)

def test_boolean_expr_1():
  numpy.testing.assert_equal(evaluator().evaluate(ast.parse("1 < 2 and 2 < 3")), True)

def test_boolean_expr_2():
  numpy.testing.assert_equal(evaluator().evaluate(ast.parse("1 == 2 or 3 == 2 + 1")), True)

def test_name_lookup_dict():
  numpy.testing.assert_almost_equal(evaluator({"pi" : scipy.constants.pi, "golden" : scipy.constants.golden}).evaluate(ast.parse("pi + golden")), scipy.constants.pi + scipy.constants.golden)

def test_name_lookup_callback():
  class custom_lookup:
    def __contains__(self, key):
      return key in ["pi", "golden"]
    def __getitem__(self, key):
      if key == "pi":
        return scipy.constants.pi
      elif key == "golden":
        return scipy.constants.golden
      else:
        raise KeyError()
  numpy.testing.assert_almost_equal(evaluator(custom_lookup()).evaluate(ast.parse("pi + golden")), scipy.constants.pi + scipy.constants.golden)

