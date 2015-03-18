from behave import *

import nose.tools
import slycat.hyperchunks

@when(u'creating an empty Hyperchunks object.')
def step_impl(context):
  context.hyperchunks = slycat.hyperchunks.Hyperchunks()

@then(u'the result should be an empty Hyperchunks object.')
def step_impl(context):
  nose.tools.assert_equal(len(context.hyperchunks), 0)
  nose.tools.assert_equal(context.hyperchunks.format(), "")

@when(u'creating an empty Hyperchunk object.')
def step_impl(context):
  context.hyperchunk = slycat.hyperchunks.Hyperchunk()

@then(u'the result should be an empty Hyperchunk object.')
def step_impl(context):
  nose.tools.assert_equal(context.hyperchunk.format(), ".../...")

@when(u'creating an empty Hyperslices object.')
def step_impl(context):
  context.hyperslices = slycat.hyperchunks.Hyperslices()

@then(u'the result should be an empty Hyperslices object.')
def step_impl(context):
  nose.tools.assert_equal(len(context.hyperslices), 0)
  nose.tools.assert_equal(context.hyperslices.format(), "")

@when(u'creating an empty Hyperslice object, an exception should be raised.')
def step_impl(context):
  with nose.tools.assert_raises(TypeError):
    slycat.hyperchunks.Hyperslice()

