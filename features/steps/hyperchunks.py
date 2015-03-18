from behave import *

import nose.tools
import slycat.hyperchunks

@when(u'a Hyperchunks object is created without parameters.')
def step_impl(context):
  context.hyperchunks = slycat.hyperchunks.Hyperchunks()

@then(u'the Hyperchunks object should be empty.')
def step_impl(context):
  nose.tools.assert_equal(len(context.hyperchunks), 0)
  nose.tools.assert_equal(context.hyperchunks.format(), "")

@when(u'a Hyperchunk object is created without parameters.')
def step_impl(context):
  context.hyperchunk = slycat.hyperchunks.Hyperchunk()

@then(u'the Hyperchunk object should select all arrays and all attributes.')
def step_impl(context):
  nose.tools.assert_equal(context.hyperchunk.format(), ".../...")

@when(u'a Hyperslices object is created without parameters.')
def step_impl(context):
  context.hyperslices = slycat.hyperchunks.Hyperslices()

@then(u'the Hyperslices object should be empty.')
def step_impl(context):
  nose.tools.assert_equal(len(context.hyperslices), 0)
  nose.tools.assert_equal(context.hyperslices.format(), "")

@when(u'a Hyperslice object is created without parameters, an exception should be raised.')
def step_impl(context):
  with nose.tools.assert_raises(TypeError):
    slycat.hyperchunks.Hyperslice()

