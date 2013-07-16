from __future__ import division

import ast
import numpy
import sys

class expression(ast.NodeVisitor):
  def __init__(self):
    self.stack = []

  def visit_Num(self, node):
    self.generic_visit(node)
    self.stack.append(node.n)

  def visit_BinOp(self, node):
    self.generic_visit(node)
    operator = node.op
    roperand = self.stack.pop()
    loperand = self.stack.pop()
    if isinstance(operator, ast.Add):
      self.stack.append(loperand + roperand)
    elif isinstance(operator, ast.BitAnd):
      self.stack.append(loperand & roperand)
    elif isinstance(operator, ast.BitOr):
      self.stack.append(loperand | roperand)
    elif isinstance(operator, ast.BitXor):
      self.stack.append(loperand ^ roperand)
    elif isinstance(operator, ast.Div):
      self.stack.append(loperand / roperand)
    elif isinstance(operator, ast.FloorDiv):
      self.stack.append(loperand // roperand)
    elif isinstance(operator, ast.LShift):
      self.stack.append(loperand << roperand)
    elif isinstance(operator, ast.Mod):
      self.stack.append(loperand % roperand)
    elif isinstance(operator, ast.Mult):
      self.stack.append(loperand * roperand)
    elif isinstance(operator, ast.Pow):
      self.stack.append(loperand ** roperand)
    elif isinstance(operator, ast.RShift):
      self.stack.append(loperand >> roperand)
    elif isinstance(operator, ast.Sub):
      self.stack.append(loperand - roperand)
    else:
      raise Exception("Unsupported binary operator: %s" % operator)

  def visit_UnaryOp(self, node):
    self.generic_visit(node)
    operator = node.op
    operand = self.stack.pop()
    if isinstance(operator, ast.Invert):
      self.stack.append(~operand)
    elif isinstance(operator, ast.Not):
      self.stack.append(numpy.logical_not(operand))
    elif isinstance(operator, ast.UAdd):
      self.stack.append(+operand)
    elif isinstance(operator, ast.USub):
      self.stack.append(-operand)
    else:
      raise Exception("Unsupported unary operator: %s" % operator)

  def visit_Compare(self, node):
    #sys.stderr.write("Expression: %s\n" % ast.dump(node))
    self.generic_visit(node)
    operator = node.ops[0]
    roperand = self.stack.pop()
    loperand = self.stack.pop()
    if isinstance(operator, ast.Eq):
      self.stack.append(loperand == roperand)
    elif isinstance(operator, ast.Gt):
      self.stack.append(loperand > roperand)
    elif isinstance(operator, ast.GtE):
      self.stack.append(loperand >= roperand)
    elif isinstance(operator, ast.Lt):
      self.stack.append(loperand < roperand)
    elif isinstance(operator, ast.LtE):
      self.stack.append(loperand <= roperand)
    else:
      raise Exception("Unsupported comparison operator: %s" % operator)

  def visit_BoolOp(self, node):
    self.generic_visit(node)
    operator = node.op
    roperand = self.stack.pop()
    loperand = self.stack.pop()
    if isinstance(operator, ast.And):
      self.stack.append(loperand and roperand)
    elif isinstance(operator, ast.Or):
      self.stack.append(loperand or roperand)
    else:
      raise Exception("Unsupported boolean operator: %s" % operator)

  def evaluate(self, node):
    #sys.stderr.write("Expression: %s\n" % ast.dump(node))
    self.visit(node)
    return self.stack.pop()

def test_add():
  numpy.testing.assert_equal(expression().evaluate(ast.parse("2+3")), 5)

def test_bitand():
  numpy.testing.assert_equal(expression().evaluate(ast.parse("2 & 3")), 2)

def test_bitor():
  numpy.testing.assert_equal(expression().evaluate(ast.parse("2 | 3")), 3)

def test_bitxor():
  numpy.testing.assert_equal(expression().evaluate(ast.parse("2 ^ 3")), 1)

def test_div():
  numpy.testing.assert_almost_equal(expression().evaluate(ast.parse("2/3")), 2/3)

def test_floordiv():
  numpy.testing.assert_equal(expression().evaluate(ast.parse("2//3")), 0)

def test_eq():
  numpy.testing.assert_equal(expression().evaluate(ast.parse("2 == 3")), False)

def test_gt():
  numpy.testing.assert_equal(expression().evaluate(ast.parse("2 > 3")), False)

def test_gte():
  numpy.testing.assert_equal(expression().evaluate(ast.parse("2 >= 3")), False)

def test_invert():
  numpy.testing.assert_equal(expression().evaluate(ast.parse("~1")), -2)

def test_lshift():
  numpy.testing.assert_equal(expression().evaluate(ast.parse("2 << 1")), 4)

def test_lt():
  numpy.testing.assert_equal(expression().evaluate(ast.parse("2 < 3")), True)

def test_lte():
  numpy.testing.assert_equal(expression().evaluate(ast.parse("2 <= 3")), True)

def test_mod():
  numpy.testing.assert_equal(expression().evaluate(ast.parse("2 % 3")), 2)

def test_mult():
  numpy.testing.assert_equal(expression().evaluate(ast.parse("2*3")), 6)

def test_not():
  numpy.testing.assert_equal(expression().evaluate(ast.parse("not 1")), 0)

def test_pow():
  numpy.testing.assert_equal(expression().evaluate(ast.parse("2**3")), 8)

def test_rshift():
  numpy.testing.assert_equal(expression().evaluate(ast.parse("8 >> 1")), 4)

def test_uadd():
  numpy.testing.assert_equal(expression().evaluate(ast.parse("+(2+3)")), 5)

def test_usub():
  numpy.testing.assert_equal(expression().evaluate(ast.parse("-(2+3)")), -5)

def test_expr_1():
  numpy.testing.assert_equal(expression().evaluate(ast.parse("1+2*3")), 7)

def test_boolean_expr_1():
  numpy.testing.assert_equal(expression().evaluate(ast.parse("1 < 2 and 2 < 3")), True)

def test_boolean_expr_2():
  numpy.testing.assert_equal(expression().evaluate(ast.parse("1 == 2 or 3 == 2 + 1")), True)
