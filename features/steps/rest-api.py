from behave import *

import nose.tools
import slycat.web.client

@given(u'a running Slycat server.')
def step_impl(context):
  context.connection = slycat.web.client.Connection(host=context.server_host, proxies={"http":context.server_proxy, "https":context.server_proxy}, auth=(context.server_user, context.server_password))
  context.connection.get_configuration_version()

@when(u'a client requests the set of available markings.')
def step_impl(context):
  context.response = context.connection.get_configuration_markings()

@then(u'the server should return a list of markings.')
def step_impl(context):
  nose.tools.assert_is_instance(context.response, list)
  for item in context.response:
    nose.tools.assert_is_instance(item, dict)
    nose.tools.assert_in("badge", item)
    nose.tools.assert_in("label", item)
    nose.tools.assert_in("page-before", item)
    nose.tools.assert_in("page-after", item)
    nose.tools.assert_in("type", item)

@when(u'a client requests the set of available parsers.')
def step_impl(context):
  context.response = context.connection.get_configuration_parsers()

@then(u'the server should return a list of parsers.')
def step_impl(context):
  nose.tools.assert_is_instance(context.response, list)
  for item in context.response:
    nose.tools.assert_is_instance(item, dict)
    nose.tools.assert_in("categories", item)
    nose.tools.assert_in("label", item)
    nose.tools.assert_in("type", item)

@when(u'a client requests the set of configured remote hosts.')
def step_impl(context):
  context.response = context.connection.get_configuration_remote_hosts()

@then(u'the server should return a list of remote hosts.')
def step_impl(context):
  nose.tools.assert_is_instance(context.response, list)
  for item in context.response:
    nose.tools.assert_is_instance(item, dict)
    nose.tools.assert_in("agent", item)
    nose.tools.assert_in("hostname", item)

@when(u'a client requests the server support email.')
def step_impl(context):
  context.response = context.connection.get_configuration_support_email()

@then(u'the server should return its support email.')
def step_impl(context):
  nose.tools.assert_is_instance(context.response, dict)
  nose.tools.assert_in("address", context.response)
  nose.tools.assert_in("subject", context.response)

@when(u'a client requests the server version.')
def step_impl(context):
  context.response = context.connection.get_configuration_version()

@then(u'the server should return its version.')
def step_impl(context):
  nose.tools.assert_is_instance(context.response, dict)
  nose.tools.assert_in("commit", context.response)
  nose.tools.assert_in("version", context.response)

@when(u'a client requests available server wizards.')
def step_impl(context):
  context.response = context.connection.get_configuration_wizards()

@then(u'the server should return a list of available wizards.')
def step_impl(context):
  nose.tools.assert_is_instance(context.response, list)
  for item in context.response:
    nose.tools.assert_is_instance(item, dict)
    nose.tools.assert_in("label", item)
    nose.tools.assert_in("require", item)
    nose.tools.assert_in("type", item)

@when(u'a client requests information about the current user.')
def step_impl(context):
  context.response = context.connection.get_user()

@then(u'the server should return information about the current user.')
def step_impl(context):
  nose.tools.assert_is_instance(context.response, dict)
  nose.tools.assert_in("email", context.response)
  nose.tools.assert_in("name", context.response)
  nose.tools.assert_in("uid", context.response)
  nose.tools.assert_equal(context.response["uid"], context.server_user)

@when(u'a client requests information about another user.')
def step_impl(context):
  context.response = context.connection.get_user("foobar")

@then(u'the server should return information about the other user.')
def step_impl(context):
  nose.tools.assert_is_instance(context.response, dict)
  nose.tools.assert_in("email", context.response)
  nose.tools.assert_in("name", context.response)
  nose.tools.assert_in("uid", context.response)
  nose.tools.assert_equal(context.response["uid"], "foobar")

