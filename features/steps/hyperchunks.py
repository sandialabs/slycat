from behave import *

import nose.tools
import numpy
import slycat.hyperchunks

def assert_round_trip_equal(string):
  nose.tools.assert_equal(slycat.hyperchunks.format(slycat.hyperchunks.parse(string)), string)

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

@when(u'parsing a hyperchunk expression, 0:10 is valid.')
def step_impl(context):
  assert_round_trip_equal("0:10")

@when(u'parsing a hyperchunk expression, 0:10:2 is valid.')
def step_impl(context):
  assert_round_trip_equal("0:10:2")

@when(u'parsing a hyperchunk expression, :10:2 is valid.')
def step_impl(context):
  assert_round_trip_equal(":10:2")

@when(u'parsing a hyperchunk expression, 0::2 is valid.')
def step_impl(context):
  assert_round_trip_equal("0::2")

@when(u'parsing a hyperchunk expression, 0:10/20:30 is valid.')
def step_impl(context):
  assert_round_trip_equal("0:10/20:30")

@when(u'parsing a hyperchunk expression, .../20:30 is valid.')
def step_impl(context):
  assert_round_trip_equal(".../20:30")

@when(u'parsing a hyperchunk expression, 0:10/... is valid.')
def step_impl(context):
  assert_round_trip_equal("0:10/...")

@when(u'parsing a hyperchunk expression, 0/1/20 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/1/20")

@when(u'parsing a hyperchunk expression, 0/1/20:30 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/1/20:30")

@when(u'parsing a hyperchunk expression, 0/1/20,30 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/1/20,30")

@when(u'parsing a hyperchunk expression, 0/1/20:30,40:50 is valid.')
def step_impl(context):
  assert_round_trip_equal("0/1/20:30,40:50")

