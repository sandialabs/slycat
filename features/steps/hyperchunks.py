from behave import *

import nose.tools
import numpy
import slycat.hyperchunks



@when(u'a Hyperchunks object is created without parameters.')
def step_impl(context):
  context.hyperchunks = slycat.hyperchunks.Hyperchunks()

@then(u'the Hyperchunks object should be empty.')
def step_impl(context):
  nose.tools.assert_equal(len(context.hyperchunks), 0)
  nose.tools.assert_equal(context.hyperchunks.format(), "")



@when(u'a Hyperchunk object is created without parameters, an exception must be raised.')
def step_impl(context):
  with nose.tools.assert_raises(TypeError):
    slycat.hyperchunks.Hyperchunk()

@when(u'creating a Hyperchunk with one array')
def step_impl(context):
  context.hyperchunk = slycat.hyperchunks.Hyperchunk(numpy.index_exp[1])

@then(u'the Hyperchunk should contain one array')
def step_impl(context):
  nose.tools.assert_equal(context.hyperchunk.format(), "1")

@when(u'creating a Hyperchunk with an array range')
def step_impl(context):
  context.hyperchunk = slycat.hyperchunks.Hyperchunk(numpy.index_exp[1:10])

@then(u'the Hyperchunk should contain an array range')
def step_impl(context):
  nose.tools.assert_equal(context.hyperchunk.format(), "1:10")

@when(u'creating a Hyperchunk with all arrays')
def step_impl(context):
  context.hyperchunk = slycat.hyperchunks.Hyperchunk(numpy.index_exp[...])

@then(u'the Hyperchunk should contain all arrays')
def step_impl(context):
  nose.tools.assert_equal(context.hyperchunk.format(), "...")

@when(u'creating a Hyperchunk with one array and one attribute')
def step_impl(context):
  context.hyperchunk = slycat.hyperchunks.Hyperchunk(numpy.index_exp[1], numpy.index_exp[2])

@then(u'the Hyperchunk should contain one array and one attribute')
def step_impl(context):
  nose.tools.assert_equal(context.hyperchunk.format(), "1/2")

@when(u'creating a Hyperchunk with one array and a range of attributes')
def step_impl(context):
  context.hyperchunk = slycat.hyperchunks.Hyperchunk(numpy.index_exp[1], numpy.index_exp[2:5])

@then(u'the Hyperchunk should contain one array and a range of attributes')
def step_impl(context):
  nose.tools.assert_equal(context.hyperchunk.format(), "1/2:5")

@when(u'creating a Hyperchunk with one array and all attributes')
def step_impl(context):
  context.hyperchunk = slycat.hyperchunks.Hyperchunk(numpy.index_exp[1], numpy.index_exp[...])

@then(u'the Hyperchunk should contain one array and all attributes')
def step_impl(context):
  nose.tools.assert_equal(context.hyperchunk.format(), "1/...")



@when(u'a Hyperslices object is created without parameters.')
def step_impl(context):
  context.hyperslices = slycat.hyperchunks.Hyperslices()

@then(u'the Hyperslices object should be empty.')
def step_impl(context):
  nose.tools.assert_equal(len(context.hyperslices), 0)
  nose.tools.assert_equal(context.hyperslices.format(), "")

@when(u'a Hyperslice object is created without parameters, an exception must be raised.')
def step_impl(context):
  with nose.tools.assert_raises(TypeError):
    slycat.hyperchunks.Hyperslice()

@when(u'creating a Hyperslice with one index')
def step_impl(context):
  context.hyperslice = slycat.hyperchunks.Hyperslice(numpy.index_exp[1])

@then(u'the Hyperslice should contain one index')
def step_impl(context):
  nose.tools.assert_equal(context.hyperslice.format(), "1")

@when(u'creating a Hyperslice with a half-open range [...) of indices')
def step_impl(context):
  context.hyperslice = slycat.hyperchunks.Hyperslice(numpy.index_exp[1:])

@then(u'the Hyperslice should contain a half-open range [...) of indices')
def step_impl(context):
  nose.tools.assert_equal(context.hyperslice.format(), "1:")

@when(u'creating a Hyperslice with a half-open range (...] of indices')
def step_impl(context):
  context.hyperslice = slycat.hyperchunks.Hyperslice(numpy.index_exp[:5])

@then(u'the Hyperslice should contain a half-open range (...] of indices')
def step_impl(context):
  nose.tools.assert_equal(context.hyperslice.format(), ":5")

@when(u'creating a Hyperslice with a full-open range')
def step_impl(context):
  context.hyperslice = slycat.hyperchunks.Hyperslice(numpy.index_exp[:])

@then(u'the Hyperslice should contain a full-open range')
def step_impl(context):
  nose.tools.assert_equal(context.hyperslice.format(), ":")

@when(u'creating a Hyperslice with a closed range')
def step_impl(context):
  context.hyperslice = slycat.hyperchunks.Hyperslice(numpy.index_exp[1:5])

@then(u'the Hyperslice should contain a closed range')
def step_impl(context):
  nose.tools.assert_equal(context.hyperslice.format(), "1:5")

@when(u'creating a Hyperslice with all indices')
def step_impl(context):
  context.hyperslice = slycat.hyperchunks.Hyperslice(numpy.index_exp[...])

@then(u'the Hyperslice should contain all indices')
def step_impl(context):
  nose.tools.assert_equal(context.hyperslice.format(), "...")

@when(u'creating a Hyperslice with stepped half-open range [...) of indices')
def step_impl(context):
  context.hyperslice = slycat.hyperchunks.Hyperslice(numpy.index_exp[1::2])

@then(u'the Hyperslice should contain stepped half-open range [...) of indices')
def step_impl(context):
  nose.tools.assert_equal(context.hyperslice.format(), "1::2")

@when(u'creating a Hyperslice with stepped half-open range (...] of indices')
def step_impl(context):
  context.hyperslice = slycat.hyperchunks.Hyperslice(numpy.index_exp[:5:2])

@then(u'the Hyperslice should contain stepped half-open range (...] of indices')
def step_impl(context):
  nose.tools.assert_equal(context.hyperslice.format(), ":5:2")

@when(u'creating a Hyperslice with stepped full-open range of indices')
def step_impl(context):
  context.hyperslice = slycat.hyperchunks.Hyperslice(numpy.index_exp[::2])

@then(u'the Hyperslice should contain stepped full-open range of indices')
def step_impl(context):
  nose.tools.assert_equal(context.hyperslice.format(), "::2")

@when(u'creating a Hyperslice with stepped closed range of indices')
def step_impl(context):
  context.hyperslice = slycat.hyperchunks.Hyperslice(numpy.index_exp[1:5:2])

@then(u'the Hyperslice should contain stepped closed range of indices')
def step_impl(context):
  nose.tools.assert_equal(context.hyperslice.format(), "1:5:2")

