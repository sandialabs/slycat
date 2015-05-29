from behave import *

import cherrypy
import nose.tools
import slycat.web.client

def require_valid_project(project):
  nose.tools.assert_is_instance(project, dict)
  for field in ["description", "creator", "_rev", "created", "acl", "_id", "type", "name"]:
    nose.tools.assert_in(field, project)
  nose.tools.assert_is_instance(project["acl"], dict)
  for field in ["administrators", "writers", "readers"]:
    nose.tools.assert_in(field, project["acl"])
    for item in project["acl"][field]:
      nose.tools.assert_is_instance(item, dict)
  return project

@given(u'a running Slycat server.')
def step_impl(context):
  context.connection = slycat.web.client.Connection(host=context.server_host, proxies={"http":context.server_proxy, "https":context.server_proxy}, auth=(context.server_user, context.server_password))
  context.connection.get_configuration_version()

@given(u'a default project.')
def step_impl(context):
  context.pid = context.connection.post_projects("Test", "Description")

@when(u'a client deletes the project.')
def step_impl(context):
  context.connection.delete_project(context.pid)

@then(u'the project should no longer exist.')
def step_impl(context):
  with nose.tools.assert_raises(Exception) as raised:
    context.connection.get_project(context.pid)
    nose.tools.assert_equal(raised.exception.code, 404)

@given(u'a sample bookmark.')
def step_impl(context):
  context.bid = context.connection.post_project_bookmarks(context.pid, {"foo":"bar", "baz":5, "blah":[1, 2, 3]})

@when(u'a client retrieves the project bookmark.')
def step_impl(context):
  context.bookmark = context.connection.get_bookmark(context.bid)

@then(u'the project bookmark should be retrieved.')
def step_impl(context):
  nose.tools.assert_equal(context.bookmark, {"foo":"bar", "baz":5, "blah":[1, 2, 3]})

@when(u'a client requests the set of available markings.')
def step_impl(context):
  context.markings = context.connection.get_configuration_markings()

@then(u'the server should return a list of markings.')
def step_impl(context):
  nose.tools.assert_is_instance(context.markings, list)
  for item in context.markings:
    nose.tools.assert_is_instance(item, dict)
    for field in ["badge", "label", "page-before", "page-after", "type"]:
      nose.tools.assert_in(field, item)

@when(u'a client requests the set of available parsers.')
def step_impl(context):
  context.parsers = context.connection.get_configuration_parsers()

@then(u'the server should return a list of parsers.')
def step_impl(context):
  nose.tools.assert_is_instance(context.parsers, list)
  for item in context.parsers:
    nose.tools.assert_is_instance(item, dict)
    for field in ["categories", "label", "type"]:
      nose.tools.assert_in(field, item)

@when(u'a client requests the set of configured remote hosts.')
def step_impl(context):
  context.remote_hosts = context.connection.get_configuration_remote_hosts()

@then(u'the server should return a list of remote hosts.')
def step_impl(context):
  nose.tools.assert_is_instance(context.remote_hosts, list)
  for item in context.remote_hosts:
    nose.tools.assert_is_instance(item, dict)
    for field in ["agent", "hostname"]:
      nose.tools.assert_in(field, item)

@when(u'a client requests the server support email.')
def step_impl(context):
  context.support_email = context.connection.get_configuration_support_email()

@then(u'the server should return its support email.')
def step_impl(context):
  nose.tools.assert_is_instance(context.support_email, dict)
  for field in ["address", "subject"]:
    nose.tools.assert_in(field, context.support_email)

@when(u'a client requests the server version.')
def step_impl(context):
  context.version = context.connection.get_configuration_version()

@then(u'the server should return its version.')
def step_impl(context):
  nose.tools.assert_is_instance(context.version, dict)
  for field in ["commit", "version"]:
    nose.tools.assert_in(field, context.version)

@when(u'a client requests available server wizards.')
def step_impl(context):
  context.wizards = context.connection.get_configuration_wizards()

@then(u'the server should return a list of available wizards.')
def step_impl(context):
  nose.tools.assert_is_instance(context.wizards, list)
  for item in context.wizards:
    nose.tools.assert_is_instance(item, dict)
    for field in ["label", "require", "type"]:
      nose.tools.assert_in(field, item)

@when(u'a client retrieves the project.')
def step_impl(context):
  context.project = require_valid_project(context.connection.get_project(context.pid))

@then(u'the server should return the project.')
def step_impl(context):
  nose.tools.assert_equal(context.project["name"], "Test")
  nose.tools.assert_equal(context.project["description"], "Description")
  nose.tools.assert_equal(context.project["acl"]["administrators"], [{"user":context.server_user}])
  nose.tools.assert_equal(context.project["acl"]["writers"], [])
  nose.tools.assert_equal(context.project["acl"]["readers"], [])
  context.connection.delete_project(context.pid)

@given(u'another default project.')
def step_impl(context):
  context.pid2 = context.connection.post_projects("Test", "Description")

@when(u'a client retrieves all projects.')
def step_impl(context):
  context.projects = context.connection.get_projects()

@then(u'the server should return all projects.')
def step_impl(context):
  nose.tools.assert_is_instance(context.projects, dict)
  nose.tools.assert_in("projects", context.projects)
  for project in context.projects["projects"]:
    require_valid_project(project)
  context.connection.delete_project(context.pid2)
  context.connection.delete_project(context.pid)

@when(u'a client requests information about the current user.')
def step_impl(context):
  context.user = context.connection.get_user()

@then(u'the server should return information about the current user.')
def step_impl(context):
  nose.tools.assert_is_instance(context.user, dict)
  for field in ["email", "name", "uid"]:
    nose.tools.assert_in(field, context.user)
  nose.tools.assert_equal(context.user["uid"], context.server_user)

@when(u'a client requests information about another user.')
def step_impl(context):
  context.user = context.connection.get_user("foobar")

@then(u'the server should return information about the other user.')
def step_impl(context):
  nose.tools.assert_is_instance(context.user, dict)
  for field in ["email", "name", "uid"]:
    nose.tools.assert_in(field, context.user)
  nose.tools.assert_equal(context.user["uid"], "foobar")

@when(u'a client saves a project bookmark.')
def step_impl(context):
  context.bid = context.connection.post_project_bookmarks(context.pid, {"foo":"bar", "baz":5, "blah":[1, 2, 3]})

@then(u'the project bookmark should be saved.')
def step_impl(context):
  context.bookmark = context.connection.get_bookmark(context.bid)
  nose.tools.assert_equal(context.bookmark, {"foo":"bar", "baz":5, "blah":[1, 2, 3]})

@when(u'a client creates a new project.')
def step_impl(context):
  context.pid = context.connection.post_projects("Test", "Description")

@then(u'the project should be created.')
def step_impl(context):
  context.project = require_valid_project(context.connection.get_project(context.pid))
  nose.tools.assert_equal(context.project["name"], "Test")
  nose.tools.assert_equal(context.project["description"], "Description")
  nose.tools.assert_equal(context.project["acl"]["administrators"], [{"user":context.server_user}])
  nose.tools.assert_equal(context.project["acl"]["writers"], [])
  nose.tools.assert_equal(context.project["acl"]["readers"], [])
  context.connection.delete_project(context.pid)

@when(u'a client modifies the project.')
def step_impl(context):
  context.connection.put_project(context.pid, {"name":"MyProject", "description":"My description.", "acl":{"administrators":[{"user":context.server_user}], "writers":[{"user":"foo"}], "readers":[{"user":"baz"}]}})

@then(u'the project should be modified.')
def step_impl(context):
  context.project = require_valid_project(context.connection.get_project(context.pid))
  nose.tools.assert_equal(context.project["name"], "MyProject")
  nose.tools.assert_equal(context.project["description"], "My description.")
  nose.tools.assert_equal(context.project["acl"]["administrators"], [{"user":context.server_user}])
  nose.tools.assert_equal(context.project["acl"]["writers"], [{"user":"foo"}])
  nose.tools.assert_equal(context.project["acl"]["readers"], [{"user":"baz"}])
  context.connection.delete_project(context.pid)

