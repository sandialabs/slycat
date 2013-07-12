# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import requests

def assert_true(expression):
  """Raises an assertion if the expression isn't true."""
  if not expression:
    raise AssertionError("%s is not True" % (expression))

def assert_equal(lhs, rhs):
  """Raises an assertion if the expressions aren't equal."""
  if lhs != rhs:
    raise AssertionError("%s != %s" % (lhs, rhs))

def assert_dict(expression, contains=[], excludes=[], matches={}):
  """Raises an assertion if the expression isn't a dict, doesn't contain any of
  the keys in contains, contains any of the keys in excludes, or contains
  values that don't match matches."""
  if not isinstance(expression, dict):
    raise AssertionError("%s is not a dict" % (expression))
  for key in contains:
    if key not in expression:
      raise AssertionError("%s missing %s" % (expression, key))
  for key in excludes:
    if key in expression:
      raise AssertionError("%s shouldn't contain %s" % (expression, key))
  for key in matches:
    if key not in expression:
      raise AssertionError("%s missing %s" % (expression, key))
    if expression[key] != matches[key]:
      raise AssertionError("%s != %s" % (expression[key], matches[key]))

class assert_raises(object):
  """Context manager that raises an assertion if the contained expression
  doesn't throw an exception of the requested type."""
  def __init__(self, exception_type):
    self.exception_type = exception_type
    self.exception = None

  def __enter__(self):
    return self

  def __exit__(self, exception_type, exception_value, exception_traceback):
    if exception_type != self.exception_type:
      raise AssertionError("Expected %s exception" % self.exception_type)
    self.exception = exception_value
    return True

class assert_http_status(object):
  """Context manager that raises an assertion if the contained expression
  doesn't raise the given HTTP status."""
  def __init__(self, code):
    self.code = code

  def __enter__(self):
    return self

  def __exit__(self, exception_type, exception_value, exception_traceback):
    if exception_type != requests.exceptions.HTTPError:
      raise AssertionError("Expected requests.exceptions.HTTPError exception")
    if exception_value.response.status_code != self.code:
      raise AssertionError("Expected status code %s, received %s" % (self.code, exception_value.response.status_code))
    return True

