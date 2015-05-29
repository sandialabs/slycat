from behave import *

import nose.tools
import slycat.web.client

@given(u'a running Slycat server.')
def step_impl(context):
  context.connection = slycat.web.client.Connection(host=context.server_host, proxies={"http":context.server_proxy, "https":context.server_proxy}, auth=(context.server_user, context.server_password))
  context.connection.get_configuration_version()

@when(u'a client requests the server version.')
def step_impl(context):
  context.result = context.connection.get_configuration_version()

@then(u'the server should return its version.')
def step_impl(context):
  nose.tools.assert_is_instance(context.result, dict)
  nose.tools.assert_in("commit", context.result)
  nose.tools.assert_in("version", context.result)

