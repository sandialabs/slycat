from behave import *

import nose.tools
import numpy
import pyparsing
import slycat.hyperchunks

def assert_round_trip_equal(string, result=None):
  nose.tools.assert_equal(slycat.hyperchunks.tostring(slycat.hyperchunks.parse(string)), string if result is None else result)

def expansion(hyperchunks, array_count, attribute_count):
  for array in slycat.hyperchunks.arrays(hyperchunks, array_count):
    if array.attribute_count:
      for attribute in array.attributes(attribute_count):
        if isinstance(attribute.expression, slycat.hyperchunks.grammar.AttributeIndex):
          if attribute.hyperslice_count:
            for hyperslice in attribute.hyperslices():
              yield (array.index, attribute.expression.index, hyperslice)
          else:
            yield (array.index, attribute.expression.index)
        else:
          if attribute.hyperslice_count:
            for hyperslice in attribute.hyperslices():
              yield (array.index, attribute.expression, hyperslice)
          else:
            yield (array.index, attribute.expression)
    else:
      yield (array.index,)

def assert_expansion_equal(string, array_count, attribute_count, reference):
  hyperchunks = slycat.hyperchunks.parse(string)
  nose.tools.assert_equal(list(expansion(hyperchunks, array_count, attribute_count)), reference)

@when(u'parsing a hyperchunk expression, 0 is valid.')
def step_impl(context):
  assert_round_trip_equal("0")
  assert_expansion_equal("0", 5, 5, [(0,)])

@when(u'parsing a hyperchunk expression, 0;1 is valid.')
def step_impl(context):
  assert_round_trip_equal("0;1")
  assert_expansion_equal("0;1", 5, 5, [(0,), (1,)])

@when(u'parsing a hyperchunk expression, 0/1 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/1")
  assert_expansion_equal("0/1", 5, 5, [(0, 1)])

@when(u'parsing a hyperchunk expression, 0/1;2/3 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/1;2/3")
  assert_expansion_equal("0/1;2/3", 5, 5, [(0, 1), (2, 3)])

@when(u'parsing a hyperchunk expression, 0:5 is valid.')
def step_impl(context):
  assert_round_trip_equal("0:5")
  assert_expansion_equal("0:5", 5, 5, [(0,), (1,), (2,), (3,), (4,)])

@when(u'parsing a hyperchunk expression, 0:5:2 is valid.')
def step_impl(context):
  assert_round_trip_equal("0:5:2")
  assert_expansion_equal("0:5:2", 5, 5, [(0,), (2,), (4,)])

@when(u'parsing a hyperchunk expression, :5:2 is valid.')
def step_impl(context):
  assert_round_trip_equal(":5:2")
  assert_expansion_equal(":5:2", 5, 5, [(0,), (2,), (4,)])

@when(u'parsing a hyperchunk expression, 0::2 is valid.')
def step_impl(context):
  assert_round_trip_equal("0::2")
  assert_expansion_equal("0::2", 5, 5, [(0,), (2,), (4,)])

@when(u'parsing a hyperchunk expression, 0:5/10:15 is valid.')
def step_impl(context):
  assert_round_trip_equal("0:5/10:15")
  assert_expansion_equal("0:5/10:15", 2, 13, [(0, 10), (0, 11), (0, 12), (1, 10), (1, 11), (1, 12)])

@when(u'parsing a hyperchunk expression, .../10:15 is valid.')
def step_impl(context):
  assert_round_trip_equal(".../10:15")
  assert_expansion_equal(".../10:15", 2, 15, [(0, 10), (0, 11), (0, 12), (0, 13), (0, 14), (1, 10), (1, 11), (1, 12), (1, 13), (1, 14)])

@when(u'parsing a hyperchunk expression, 0:5/... is valid.')
def step_impl(context):
  assert_round_trip_equal("0:5/...")
  assert_expansion_equal("0:5/...", 5, 2, [(0, 0), (0, 1), (1, 0), (1, 1), (2, 0), (2, 1), (3, 0), (3, 1), (4, 0), (4, 1)])

@when(u'parsing a hyperchunk expression, 0/1/20 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/1/20")
  assert_expansion_equal("0/1/20", 5, 5, [(0, 1, (20,))])

@when(u'parsing a hyperchunk expression, 0/1/20:25 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/1/20:25")
  assert_expansion_equal("0/1/20:25", 5, 5, [(0, 1, (slice(20, 25),))])

@when(u'parsing a hyperchunk expression, 0/1/20,25 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/1/20,25")
  assert_expansion_equal("0/1/20,25", 5, 5, [(0, 1, (20, 25))])

@when(u'parsing a hyperchunk expression, 0/1/20:25,30:35 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/1/20:25,30:35")
  assert_expansion_equal("0/1/20:25,30:35", 5, 5, [(0, 1, (slice(20, 25), slice(30, 35)))])

@when(u'parsing a hyperchunk expression, 0/1/20!25 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/1/20|25")

@when(u'parsing a hyperchunk expression, 0/1/20:25!30:35 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/1/20:25|30:35")
  assert_expansion_equal("0/1/20:25|30:35", 5, 5, [(0, 1, (slice(20, 25),)), (0, 1, (slice(30, 35),))])

@when(u'parsing a hyperchunk expression, 0!1 is valid.')
def step_impl(context):
  assert_round_trip_equal("0|1")
  assert_expansion_equal("0|1", 5, 5, [(0,), (1,)])

@when(u'parsing a hyperchunk expression, 0/1!2 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/1|2")
  assert_expansion_equal("0/1|2", 5, 5, [(0, 1), (0, 2)])

@when(u'parsing a hyperchunk expression, 0/indices() is valid.')
def step_impl(context):
  assert_round_trip_equal("0/indices()")
  #assert_expansion_equal("0/indices()", 5, 5, [(0, slycat.hyperchunks.grammar.FunctionCall("indices"))])

@when(u'parsing a hyperchunk expression, 0/indices(0) is valid.')
def step_impl(context):
  assert_round_trip_equal("0/indices(0)")
  #assert_expansion_equal("0/indices(0)", 5, 5, [(0, slycat.hyperchunks.grammar.FunctionCall("indices", 0))])

@when(u'parsing a hyperchunk expression, 0/indices(0.5) is valid.')
def step_impl(context):
  assert_round_trip_equal("0/indices(0.5)")
  #assert_expansion_equal("0/indices(0.5)", 5, 5, [(0, slycat.hyperchunks.grammar.FunctionCall("indices", 0.5))])

@when(u'parsing a hyperchunk expression, 0/indices("red") is valid.')
def step_impl(context):
  assert_round_trip_equal("""0/indices("red")""")
  #assert_expansion_equal("""0/indices("red")""", 5, 5, [(0, slycat.hyperchunks.grammar.FunctionCall("indices", "red"))])

@when(u'parsing a hyperchunk expression, 0/indices(0, 0.5, "red") is valid.')
def step_impl(context):
  assert_round_trip_equal("""0/indices(0, 0.5, "red")""")
  #assert_expansion_equal("""0/indices(0, 0.5, "red")""", 5, 5, [(0, slycat.hyperchunks.grammar.FunctionCall("indices", 0, 0.5, "red"))])

@when(u'parsing a hyperchunk expression, 0/indices(0)/0:50 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/indices(0)/0:50")
  #assert_expansion_equal("0/indices(0)/0:50", 5, 5, [(0, slycat.hyperchunks.grammar.FunctionCall("indices", 0), (slice(0, 50),))])

@when(u'parsing a hyperchunk expression, 0/a1 > 2 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/a1 > 2.0")
  #assert_expansion_equal("0/a1 > 2.0", 5, 5, [(0, slycat.hyperchunks.grammar.BinaryOperator(slycat.hyperchunks.grammar.AttributeIndex(1), ">", 2.0))])

@when(u'parsing a hyperchunk expression, 0/a1 > 2/0:50 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/a1 > 2.0/0:50")
  #assert_expansion_equal("0/a1 > 2.0/0:50", 5, 5, [(0, slycat.hyperchunks.grammar.BinaryOperator(slycat.hyperchunks.grammar.AttributeIndex(1), ">", 2.0), (slice(0, 50),))])

@when(u'parsing a hyperchunk expression, 0/a1 > 2 and a1 < 4/0:50 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/a1 > 2.0 and a1 < 4.0/0:50")
  #assert_expansion_equal("0/a1 > 2.0 and a1 < 4.0/0:50", 5, 5, [(0,
  #  slycat.hyperchunks.grammar.BinaryOperator(
  #    slycat.hyperchunks.grammar.BinaryOperator(slycat.hyperchunks.grammar.AttributeIndex(1), ">", 2.0),
  #    "and",
  #    slycat.hyperchunks.grammar.BinaryOperator(slycat.hyperchunks.grammar.AttributeIndex(1), "<", 4.0),
  #    ), (slice(0, 50),))])

@when(u'parsing a hyperchunk expression, 0/a1 in [0, 5, 6] is valid.')
def step_impl(context):
  assert_round_trip_equal("0/a1 in [0, 5, 6]")

@when(u'parsing a hyperchunk expression, 0/a1 in ["red", "cayenne"] is valid.')
def step_impl(context):
  assert_round_trip_equal("""0/a1 in ["red", "cayenne"]""")

@when(u'parsing a hyperchunk expression, 0/.../order: rank(a1, "asc")/0:50 is valid.')
def step_impl(context):
  assert_round_trip_equal("""0/.../order:rank(a1, "asc")/0:50""")











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


