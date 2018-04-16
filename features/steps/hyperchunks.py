# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

from behave import *

import nose.tools
import numpy
import pyparsing
import slycat.hyperchunks

def assert_round_trip_equal(string, result=None):
  nose.tools.assert_equal(slycat.hyperchunks.tostring(slycat.hyperchunks.parse(string)), string if result is None else result)

@when(u'parsing a hyperchunk expression, 0 is valid.')
def step_impl(context):
  assert_round_trip_equal("0")

@when(u'parsing a hyperchunk expression, 0;1 is valid.')
def step_impl(context):
  assert_round_trip_equal("0;1")

@when(u'parsing a hyperchunk expression, 0/1 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/1")

@when(u'parsing a hyperchunk expression, 0/1;2/3 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/1;2/3")

@when(u'parsing a hyperchunk expression, 0:5 is valid.')
def step_impl(context):
  assert_round_trip_equal("0:5")

@when(u'parsing a hyperchunk expression, 0:5:2 is valid.')
def step_impl(context):
  assert_round_trip_equal("0:5:2")

@when(u'parsing a hyperchunk expression, :5:2 is valid.')
def step_impl(context):
  assert_round_trip_equal(":5:2")

@when(u'parsing a hyperchunk expression, 0::2 is valid.')
def step_impl(context):
  assert_round_trip_equal("0::2")

@when(u'parsing a hyperchunk expression, 0:5/10:15 is valid.')
def step_impl(context):
  assert_round_trip_equal("0:5/10:15")

@when(u'parsing a hyperchunk expression, .../10:15 is valid.')
def step_impl(context):
  assert_round_trip_equal(".../10:15")

@when(u'parsing a hyperchunk expression, 0:5/... is valid.')
def step_impl(context):
  assert_round_trip_equal("0:5/...")

@when(u'parsing a hyperchunk expression, 0/1/20 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/1/20")

@when(u'parsing a hyperchunk expression, 0/1/20:25 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/1/20:25")

@when(u'parsing a hyperchunk expression, 0/1/20,25 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/1/20,25")

@when(u'parsing a hyperchunk expression, 0/1/20:25,30:35 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/1/20:25,30:35")

@when(u'parsing a hyperchunk expression, 0/1/20!25 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/1/20|25")

@when(u'parsing a hyperchunk expression, 0/1/20:25!30:35 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/1/20:25|30:35")

@when(u'parsing a hyperchunk expression, 0!1 is valid.')
def step_impl(context):
  assert_round_trip_equal("0|1")

@when(u'parsing a hyperchunk expression, 0/1!2 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/1|2")

@when(u'parsing a hyperchunk expression, 0/indices() is valid.')
def step_impl(context):
  assert_round_trip_equal("0/indices()")

@when(u'parsing a hyperchunk expression, 0/indices(0) is valid.')
def step_impl(context):
  assert_round_trip_equal("0/indices(0)")

@when(u'parsing a hyperchunk expression, 0/indices(0.5) is valid.')
def step_impl(context):
  assert_round_trip_equal("0/indices(0.5)")

@when(u'parsing a hyperchunk expression, 0/indices("red") is valid.')
def step_impl(context):
  assert_round_trip_equal("""0/indices("red")""")

@when(u'parsing a hyperchunk expression, 0/indices(0, 0.5, "red") is valid.')
def step_impl(context):
  assert_round_trip_equal("""0/indices(0, 0.5, "red")""")

@when(u'parsing a hyperchunk expression, 0/indices(0)/0:50 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/indices(0)/0:50")

@when(u'parsing a hyperchunk expression, 0/a1 > 2 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/a1 > 2", "0/(a1 > 2)")

@when(u'parsing a hyperchunk expression, 0/a1 > 2/0:50 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/a1 > 2/0:50", "0/(a1 > 2)/0:50")

@when(u'parsing a hyperchunk expression, 0/a1 > 2 and a1 < 4/0:50 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/a1 > 2.0 and a1 < 4.0/0:50", "0/((a1 > 2.0) and (a1 < 4.0))/0:50")

@when(u'parsing a hyperchunk expression, 0/a1 < 2 and a2 < 3 or a3 < 4 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/a1 < 2 and a2 < 3 or a3 < 4", "0/(((a1 < 2) and (a2 < 3)) or (a3 < 4))")

@when(u'parsing a hyperchunk expression, 0/a1 < 2 and (a2 < 3 or a3 < 4) is valid.')
def step_impl(context):
  assert_round_trip_equal("0/a1 < 2 and (a2 < 3 or a3 < 4)", "0/((a1 < 2) and ((a2 < 3) or (a3 < 4)))")

@when(u'parsing a hyperchunk expression, 0/a1 in [0, 5, 6] is valid.')
def step_impl(context):
  assert_round_trip_equal("0/a1 in [0, 5, 6]", "0/(a1 in [0, 5, 6])")

@when(u'parsing a hyperchunk expression, 0/a1 in ["red", "cayenne"] is valid.')
def step_impl(context):
  assert_round_trip_equal("""0/a1 in ["red", "cayenne"]""", """0/(a1 in ["red", "cayenne"])""")

@when(u'parsing a hyperchunk expression, 0/a1 not in ["red", "cayenne"] is valid.')
def step_impl(context):
  assert_round_trip_equal("""0/a1 not in ["red", "cayenne"]""", """0/(a1 not in ["red", "cayenne"])""")

@when(u'parsing a hyperchunk expression, 0/.../order: rank(a1, "asc")/0:50 is valid.')
def step_impl(context):
  assert_round_trip_equal("""0/.../order:rank(a1, "asc")/0:50""")

@when(u'parsing a hyperchunk expression, 0/.../order: rank(index(0), "asc")/0:50 is valid.')
def step_impl(context):
  assert_round_trip_equal("""0/.../order:rank(index(0), "asc")/0:50""")

@when(u'parsing a hyperchunk expression, 0/index(0)!(a0 in [0, 1, 2, 3]) and (a4 <= 0.78119 and a4 >= 0.00010) and (a7 <= 0.53957 and a7 >= 0.09121)/... is valid.')
def step_impl(context):
  assert_round_trip_equal("""0/index(0)|(a0 in [0, 1, 2, 3]) and ((a4 <= 0.78119) and (a4 >= 0.0001)) and ((a7 <= 0.53957) and (a7 >= 0.09121))/...""", """0/index(0)|((a0 in [0, 1, 2, 3]) and ((a4 <= 0.78119) and (a4 >= 0.0001)) and ((a7 <= 0.53957) and (a7 >= 0.09121)))/...""")











@when(u'parsing a hyperchunk expression, foo is invalid.')
def step_impl(context):
  with nose.tools.assert_raises(pyparsing.ParseException):
    slycat.hyperchunks.parse("foo")

@when(u'parsing a hyperchunk expression, 0/foo is invalid.')
def step_impl(context):
  with nose.tools.assert_raises(pyparsing.ParseException):
    slycat.hyperchunks.parse("0/foo")

@when(u'parsing a hyperchunk expression, 0/1/foo is invalid.')
def step_impl(context):
  with nose.tools.assert_raises(pyparsing.ParseException):
    slycat.hyperchunks.parse("0/1/foo")


