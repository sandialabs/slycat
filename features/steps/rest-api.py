from behave import *

import nose.tools
import os
import slycat.web.client

server_host = os.environ.get("SLYCAT_TEST_SERVER", "https://localhost")
server_proxy = os.environ.get("SLYCAT_TEST_PROXY", "")
server_user = os.environ.get("SLYCAT_TEST_SERVER_USER", "slycat")
server_password = os.environ.get("SLYCAT_TEST_SERVER_PASSWORD", "slycat")

@given(u'a running Slycat server.')
def step_impl(context):
  context.connection = slycat.web.client.Connection(host=server_host, proxies={"http":server_proxy, "https":server_proxy}, auth=(server_user, server_password))
  context.connection.get_configuration_version()

@when(u'a client requests the server version.')
def step_impl(context):
  context.result = context.connection.get_configuration_version()

@then(u'the server should return its version.')
def step_impl(context):
  nose.tools.assert_is_instance(context.result, dict)
  nose.tools.assert_in("commit", context.result)
  nose.tools.assert_in("version", context.result)

