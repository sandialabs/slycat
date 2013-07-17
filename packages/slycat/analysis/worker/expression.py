from __future__ import division

import ast
import numpy

class evaluator(ast.NodeVisitor):
  def __init__(self, symbols = {}):
    self.stack = []
    self.symbols = symbols

  def visit_Num(self, node):
    self.generic_visit(node)
    self.stack.append(node.n)

  def visit_Name(self, node):
    self.generic_visit(node)
    if node.id not in self.symbols:
      raise Exception("Unknown symbol: %s" % node.id)
    self.stack.append(self.symbols[node.id])

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
    if len(node.ops) != 1:
      raise Exception("Unexpected number of comparison operators: %s" % node.ops)
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
    self.visit(node)
    return self.stack.pop()

