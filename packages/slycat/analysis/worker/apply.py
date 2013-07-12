# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

from __future__ import division

import ast
import numpy

from slycat.analysis.worker.api import log, array, array_iterator

class apply_array(array):
  def __init__(self, worker_index, source, attribute, expression):
    array.__init__(self, worker_index)
    self.source = source
    self.attribute = attribute
    self.expression = expression
  def dimensions(self):
    return self.source.dimensions()
  def attributes(self):
    return self.source.attributes() + [self.attribute]
  def iterator(self):
    return self.pyro_register(apply_array_iterator(self, self.source, self.attribute, self.expression))

class apply_array_iterator(array_iterator):
  def __init__(self, owner, source, attribute, expression):
    array_iterator.__init__(self, owner)
    self.iterator = source.iterator()
    self.attribute = attribute
    self.expression = expression
    self.attributes = source.attributes()
    self.dimensions = source.dimensions()
  def __del__(self):
    self.iterator.release()
  def next(self):
    self.iterator.next()
  def coordinates(self):
    return self.iterator.coordinates()
  def shape(self):
    return self.iterator.shape()
  def values(self, attribute):
    if attribute != len(self.attributes):
      return self.iterator.values(attribute)

    class expression_visitor(ast.NodeVisitor):
      def __init__(self, attributes, dimensions, iterator):
        self.iterator = iterator
        self.stack = []
        self.attribute_map = {}
        for attribute in attributes:
          self.attribute_map[attribute["name"]] = len(self.attribute_map)
        self.dimension_map = {}
        for dimension in dimensions:
          self.dimension_map[dimension["name"]] = len(self.dimension_map)
      def visit_UnaryOp(self, object):
        self.stack.append(("unary-operation", object.op))
        ast.NodeVisitor.generic_visit(self, object)
      def visit_BinOp(self, object):
        self.stack.append(("binary-operation", object.op))
        ast.NodeVisitor.generic_visit(self, object)
      def visit_Name(self, object):
        self.stack.append(("name", object.id))
      def visit_Num(self, object):
        self.stack.append(("number", object.n))
      def evaluate(self):
        type, value = self.stack.pop(0)
        if type == "unary-operation":
          expr = self.evaluate()
          if isinstance(value, ast.Invert):
            return ~expr
          elif isinstance(value, ast.Not):
            return numpy.logical_not(expr)
          elif isinstance(value, ast.UAdd):
            return +expr
          elif isinstance(value, ast.USub):
            return -expr
          else:
            raise Exception("Unknown unary operator type: %s" % (value))
        elif type == "binary-operation":
          lhs = self.evaluate()
          rhs = self.evaluate()
          if isinstance(value, ast.Add):
            return lhs + rhs
          elif isinstance(value, ast.Div):
            return lhs / rhs
          elif isinstance(value, ast.FloorDiv):
            return lhs // rhs
          elif isinstance(value, ast.LShift):
            return lhs << rhs
          elif isinstance(value, ast.Mod):
            return lhs % rhs
          elif isinstance(value, ast.Mult):
            return lhs * rhs
          elif isinstance(value, ast.Pow):
            return lhs ** rhs
          elif isinstance(value, ast.RShift):
            return lhs >> rhs
          elif isinstance(value, ast.Sub):
            return lhs - rhs
          else:
            raise Exception("Unknown binary operator type: %s" % (value))
        elif type == "name":
          if value in self.attribute_map:
            return self.iterator.values(self.attribute_map[value])
          if value in self.dimension_map:
            dimension_index = self.dimension_map[value]
            offset = self.iterator.coordinates()[dimension_index]
            shape = self.iterator.shape()
            return offset + numpy.array([coords[dimension_index] for coords in numpy.ndindex(shape)])
          else:
            raise Exception("Unknown name '%s' must be an existing attribute or dimension.")
        elif type == "number":
          return value
        else:
          raise Exception("Unknown operand: %s %s" % (type, value))

    log.debug("Evaluating %s." % ast.dump(self.expression))
    v = expression_visitor(self.attributes, self.dimensions, self.iterator)
    v.visit(self.expression)
    result = v.evaluate()
    return result.astype(self.attribute["type"])

