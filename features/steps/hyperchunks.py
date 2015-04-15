from behave import *

import nose.tools
import numpy
import slycat.hyperchunks

def assert_round_trip_equal(string):
  nose.tools.assert_equal(slycat.hyperchunks.format(slycat.hyperchunks.parse(string)), string)

def expansion(hyperchunks, array_count, attribute_count):
  for array in slycat.hyperchunks.arrays(hyperchunks, array_count):
    if len(array):
      for attribute in array.attributes(attribute_count):
        if len(attribute):
          for hyperslice in attribute.hyperslices():
            yield (array.index, attribute.index, hyperslice)
        else:
          yield (array.index, attribute.index)
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
  assert_expansion_equal("0/1/20", 5, 5, [(0, 1, 20)])

@when(u'parsing a hyperchunk expression, 0/1/20:25 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/1/20:25")
  assert_expansion_equal("0/1/20:25", 5, 5, [(0, 1, slice(20, 25))])

@when(u'parsing a hyperchunk expression, 0/1/20,25 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/1/20,25")

@when(u'parsing a hyperchunk expression, 0/1/20:25,30:35 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/1/20:25,30:35")

