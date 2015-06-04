from behave import *

import cherrypy
import datetime
import nose.tools
import PIL.Image
import slycat.web.client
import StringIO
import xml.etree.ElementTree as xml

def require_valid_user(user, uid=None):
  nose.tools.assert_is_instance(user, dict)
  for field in ["email", "name", "uid"]:
    nose.tools.assert_in(field, user)
  if uid is not None:
    nose.tools.assert_equal(user["uid"], uid)
  return user

def require_valid_image(image, width=None, height=None):
  image = PIL.Image.open(StringIO.StringIO(image))
  if width is not None:
    nose.tools.assert_equal(image.size[0], width)
  if height is not None:
    nose.tools.assert_equal(image.size[1], height)
  return image

def require_valid_support_email(support_email):
  nose.tools.assert_is_instance(support_email, dict)
  for field in ["address", "subject"]:
    nose.tools.assert_in(field, support_email)
  return support_email

def require_valid_version(version):
  nose.tools.assert_is_instance(version, dict)
  for field in ["commit", "version"]:
    nose.tools.assert_in(field, version)
  return version

def require_list(sequence, length=None, item_test=None, includes=None, excludes=None):
  nose.tools.assert_is_instance(sequence, list)
  if length is not None:
    nose.tools.assert_equal(len(sequence), length)
  if item_test is not None:
    for item in sequence:
      item_test(item)
  if includes is not None:
    for id in includes:
      nose.tools.assert_in(id, [item["_id"] for item in sequence])
  if excludes is not None:
    for item in sequence:
      nose.tools.assert_not_in(item["_id"], excludes)

def require_valid_browse(browse):
  nose.tools.assert_items_equal(browse.keys(), ['mtimes', 'sizes', 'names', 'mime-types', 'path', 'types'])
  nose.tools.assert_equal(len(browse["mtimes"]), len(browse["sizes"]))
  nose.tools.assert_equal(len(browse["mtimes"]), len(browse["names"]))
  nose.tools.assert_equal(len(browse["mtimes"]), len(browse["mime-types"]))
  nose.tools.assert_equal(len(browse["mtimes"]), len(browse["types"]))
  return browse

def require_valid_marking(marking):
  nose.tools.assert_is_instance(marking, dict)
  for field in ["badge", "label", "page-before", "page-after", "type"]:
    nose.tools.assert_in(field, marking)
  return marking

def require_valid_parser(parser):
  nose.tools.assert_is_instance(parser, dict)
  for field in ["categories", "label", "type"]:
    nose.tools.assert_in(field, parser)
  return parser

def require_valid_remote_host(remote_host):
  nose.tools.assert_is_instance(remote_host, dict)
  for field in ["agent", "hostname"]:
    nose.tools.assert_in(field, remote_host)
  return remote_host

def require_valid_wizard(wizard):
  nose.tools.assert_is_instance(wizard, dict)
  for field in ["label", "require", "type"]:
    nose.tools.assert_in(field, wizard)
  return wizard

def require_valid_timestamp(timestamp):
  return datetime.datetime.strptime(timestamp, "%Y-%m-%dT%H:%M:%S.%f")

def require_valid_project(project, name=None, description=None, creator=None):
  nose.tools.assert_is_instance(project, dict)
  for field in [ "acl", "created", "creator", "description", "_id", "name", "_rev", "type", ]:
    nose.tools.assert_in(field, project)
  nose.tools.assert_equal(project["type"], "project")
  require_valid_timestamp(project["created"])
  nose.tools.assert_is_instance(project["acl"], dict)
  for field in ["administrators", "writers", "readers"]:
    nose.tools.assert_in(field, project["acl"])
    for item in project["acl"][field]:
      nose.tools.assert_is_instance(item, dict)
  if name is not None:
    nose.tools.assert_equal(project["name"], name)
  if description is not None:
    nose.tools.assert_equal(project["description"], description)
  if creator is not None:
    nose.tools.assert_equal(project["creator"], creator)
  return project

def require_valid_reference(reference):
  nose.tools.assert_is_instance(reference, dict)
  for field in [ "bid", "created", "creator", "_id", "mid", "model-type", "name", "project", "_rev", "type", ]:
    nose.tools.assert_in(field, reference)
  nose.tools.assert_equal(reference["type"], "reference")
  require_valid_timestamp(reference["created"])
  return reference

def require_valid_model(model, name=None, mtype=None, creator=None):
  nose.tools.assert_is_instance(model, dict)
  for field in [ "artifact-types", "created", "creator", "description", "finished", "_id", "input-artifacts", "marking", "message", "model-type", "name", "progress", "project", "result", "_rev", "started", "state", "type", ]:
    nose.tools.assert_in(field, model)
  nose.tools.assert_equal(model["type"], "model")
  require_valid_timestamp(model["created"])
  nose.tools.assert_is_instance(model["artifact-types"], dict)
  for atype in model["artifact-types"].values():
    nose.tools.assert_in(atype, ["file", "hdf5", "json"])
  require_list(model["input-artifacts"])
  for aid in model["input-artifacts"]:
    nose.tools.assert_in(aid, model["artifact-types"])
  if name is not None:
    nose.tools.assert_equal(model["name"], name)
  if mtype is not None:
    nose.tools.assert_equal(model["model-type"], mtype)
  if creator is not None:
    nose.tools.assert_equal(model["creator"], creator)
  return model

sample_bookmark = {"foo":"bar", "baz":5, "blah":[1, 2, 3]}

@given(u'a running Slycat server.')
def step_impl(context):
  context.server_admin = slycat.web.client.Connection(host=context.server_host, proxies={"http":context.server_proxy, "https":context.server_proxy}, auth=(context.server_admin_user, context.server_admin_password))
  context.project_admin = slycat.web.client.Connection(host=context.server_host, proxies={"http":context.server_proxy, "https":context.server_proxy}, auth=(context.project_admin_user, context.project_admin_password))
  context.project_writer = slycat.web.client.Connection(host=context.server_host, proxies={"http":context.server_proxy, "https":context.server_proxy}, auth=(context.project_writer_user, context.project_writer_password))
  context.project_reader = slycat.web.client.Connection(host=context.server_host, proxies={"http":context.server_proxy, "https":context.server_proxy}, auth=(context.project_reader_user, context.project_reader_password))
  context.project_outsider = slycat.web.client.Connection(host=context.server_host, proxies={"http":context.server_proxy, "https":context.server_proxy}, auth=(context.project_outsider_user, context.project_outsider_password))
  context.unauthenticated_user = slycat.web.client.Connection(host=context.server_host, proxies={"http":context.server_proxy, "https":context.server_proxy})
  context.server_admin.get_configuration_version()

@given(u'a default project.')
def step_impl(context):
  context.pid = context.project_admin.post_projects("Test", "Description.")
  context.project_admin.put_project(context.pid, {"acl":{"administrators":[{"user":context.project_admin_user}], "writers":[{"user":context.project_writer_user}], "readers":[{"user":context.project_reader_user}]}})

@given(u'a project with one writer and one reader.')
def step_impl(context):
  context.pid2 = context.project_admin.post_projects("Test2", "")
  context.project_admin.put_project(context.pid2, {"acl":{"administrators":[{"user":context.project_admin_user}], "writers":[{"user":context.project_writer_user}], "readers":[{"user":context.project_reader_user}]}})

@given(u'a project with one writer and no readers.')
def step_impl(context):
  context.pid3 = context.project_admin.post_projects("Test3", "")
  context.project_admin.put_project(context.pid3, {"acl":{"administrators":[{"user":context.project_admin_user}], "writers":[{"user":context.project_writer_user}], "readers":[]}})

@given(u'a project without any writers or readers.')
def step_impl(context):
  context.pid4 = context.project_admin.post_projects("Test4", "")
  context.project_admin.put_project(context.pid4, {"acl":{"administrators":[{"user":context.project_admin_user}], "writers":[], "readers":[]}})

@given(u'a generic model.')
def step_impl(context):
  context.mid = context.project_admin.post_project_models(context.pid, "generic", "Test", description="Description.")

@given(u'a second generic model.')
def step_impl(context):
  context.mid2 = context.project_admin.post_project_models(context.pid, "generic", "Test2", description="Description2.")

@given(u'a remote session.')
def step_impl(context):
  context.sid = context.project_admin.post_remotes(context.remote_host, context.remote_user, context.remote_password)

@when(u'a client deletes the model.')
def step_impl(context):
  context.project_admin.delete_model(context.mid)

@then(u'the model should no longer exist.')
def step_impl(context):
  with nose.tools.assert_raises(Exception) as raised:
    context.project_admin.get_model(context.mid)
    nose.tools.assert_equal(raised.exception.code, 404)

@then(u'server administrators can delete the model.')
def step_impl(context):
  context.server_admin.delete_model(context.mid)

@then(u'the model no longer exists.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^404"):
    context.server_admin.get_model(context.mid)

@then(u'project administrators can delete the model.')
def step_impl(context):
  context.project_admin.delete_model(context.mid)

@then(u'project writers can delete the model.')
def step_impl(context):
  context.project_writer.delete_model(context.mid)

@then(u'project readers cannot delete the model.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_reader.delete_model(context.mid)

@then(u'the model still exists.')
def step_impl(context):
  require_valid_model(context.server_admin.get_model(context.mid))

@then(u'project outsiders cannot delete the model.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_outsider.delete_model(context.mid)

@then(u'unauthenticated users cannot delete the model.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^401"):
    context.unauthenticated_user.delete_model(context.mid)

@then(u'server administrators can delete the project.')
def step_impl(context):
  context.server_admin.delete_project(context.pid)

@then(u'the project no longer exists.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^404"):
    context.server_admin.get_project(context.pid)

@then(u'project administrators can delete the project.')
def step_impl(context):
  context.project_admin.delete_project(context.pid)

@then(u'project writers cannot delete the project.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_writer.delete_project(context.pid)

@then(u'project readers cannot delete the project.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_reader.delete_project(context.pid)

@then(u'the project still exists.')
def step_impl(context):
  require_valid_project(context.server_admin.get_project(context.pid))

@then(u'project outsiders cannot delete the project.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_reader.delete_project(context.pid)

@then(u'unauthenticated users cannot delete the project.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^401"):
    context.unauthenticated_user.delete_project(context.pid)

@when(u'a client deletes the saved bookmark.')
def step_impl(context):
  context.project_admin.delete_reference(context.rid)

@then(u'the saved bookmark should no longer exist.')
def step_impl(context):
  context.references = context.project_admin.get_project_references(context.pid)
  for reference in context.references:
    nose.tools.assert_not_equal(reference["_id"], context.rid)

@when(u'a client deletes the remote session.')
def step_impl(context):
  context.project_admin.delete_remote(context.sid)

@then(u'the remote session should no longer exist.')
def step_impl(context):
  with nose.tools.assert_raises(Exception) as raised:
    context.project_admin.post_remote_browse(context.sid, "/")
    nose.tools.assert_equal(raised.exception.code, 404)

@given(u'a sample bookmark.')
def step_impl(context):
  context.bid = context.project_admin.post_project_bookmarks(context.pid, sample_bookmark)

@then(u'server administrators can retrieve a bookmark.')
def step_impl(context):
  nose.tools.assert_equal(context.server_admin.get_bookmark(context.bid), sample_bookmark)

@then(u'project administrators can retrieve a bookmark.')
def step_impl(context):
  nose.tools.assert_equal(context.project_admin.get_bookmark(context.bid), sample_bookmark)

@then(u'project writers can retrieve a bookmark.')
def step_impl(context):
  nose.tools.assert_equal(context.project_writer.get_bookmark(context.bid), sample_bookmark)

@then(u'project readers can retrieve a bookmark.')
def step_impl(context):
  nose.tools.assert_equal(context.project_reader.get_bookmark(context.bid), sample_bookmark)

@then(u'project outsiders cannot retrieve a bookmark.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    nose.tools.assert_equal(context.project_outsider.get_bookmark(context.bid), sample_bookmark)

@then(u'unauthenticated users cannot retrieve a bookmark.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^401"):
    nose.tools.assert_equal(context.unauthenticated_user.get_bookmark(context.bid), sample_bookmark)

@then(u'Any authenticated user can request the set of available markings.')
def step_impl(context):
  require_list(context.server_admin.get_configuration_markings(), item_test=require_valid_marking)
  require_list(context.project_admin.get_configuration_markings(), item_test=require_valid_marking)
  require_list(context.project_writer.get_configuration_markings(), item_test=require_valid_marking)
  require_list(context.project_reader.get_configuration_markings(), item_test=require_valid_marking)
  require_list(context.project_outsider.get_configuration_markings(), item_test=require_valid_marking)
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^401"):
    context.unauthenticated_user.get_configuration_markings()

@then(u'Any authenticated user can request the set of available parsers.')
def step_impl(context):
  require_list(context.server_admin.get_configuration_parsers(), item_test=require_valid_parser)
  require_list(context.project_admin.get_configuration_parsers(), item_test=require_valid_parser)
  require_list(context.project_writer.get_configuration_parsers(), item_test=require_valid_parser)
  require_list(context.project_reader.get_configuration_parsers(), item_test=require_valid_parser)
  require_list(context.project_outsider.get_configuration_parsers(), item_test=require_valid_parser)
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^401"):
    context.unauthenticated_user.get_configuration_parsers()

@then(u'Any authenticated user can request the set of remote hosts.')
def step_impl(context):
  require_list(context.server_admin.get_configuration_remote_hosts(), item_test=require_valid_remote_host)
  require_list(context.project_admin.get_configuration_remote_hosts(), item_test=require_valid_remote_host)
  require_list(context.project_writer.get_configuration_remote_hosts(), item_test=require_valid_remote_host)
  require_list(context.project_reader.get_configuration_remote_hosts(), item_test=require_valid_remote_host)
  require_list(context.project_outsider.get_configuration_remote_hosts(), item_test=require_valid_remote_host)
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^401"):
    context.unauthenticated_user.get_configuration_remote_hosts()

@then(u'Any authenticated user can request the support email.')
def step_impl(context):
  require_valid_support_email(context.server_admin.get_configuration_support_email())
  require_valid_support_email(context.project_admin.get_configuration_support_email())
  require_valid_support_email(context.project_writer.get_configuration_support_email())
  require_valid_support_email(context.project_reader.get_configuration_support_email())
  require_valid_support_email(context.project_outsider.get_configuration_support_email())
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^401"):
    context.unauthenticated_user.get_configuration_support_email()

@then(u'Any authenticated user can request the server version.')
def step_impl(context):
  require_valid_version(context.server_admin.get_configuration_version())
  require_valid_version(context.project_admin.get_configuration_version())
  require_valid_version(context.project_writer.get_configuration_version())
  require_valid_version(context.project_reader.get_configuration_version())
  require_valid_version(context.project_outsider.get_configuration_version())
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^401"):
    context.unauthenticated_user.get_configuration_version()

@then(u'Any authenticated user can request the set of available wizards.')
def step_impl(context):
  require_list(context.server_admin.get_configuration_wizards(), item_test=require_valid_wizard)
  require_list(context.project_admin.get_configuration_wizards(), item_test=require_valid_wizard)
  require_list(context.project_writer.get_configuration_wizards(), item_test=require_valid_wizard)
  require_list(context.project_reader.get_configuration_wizards(), item_test=require_valid_wizard)
  require_list(context.project_outsider.get_configuration_wizards(), item_test=require_valid_wizard)
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^401"):
    context.unauthenticated_user.get_configuration_wizards()

@then(u'any authenticated user can request a global resource.')
def step_impl(context):
  require_valid_image(context.server_admin.get_global_resource("slycat-logo-navbar.png"), width=662, height=146)
  require_valid_image(context.project_admin.get_global_resource("slycat-logo-navbar.png"), width=662, height=146)
  require_valid_image(context.project_writer.get_global_resource("slycat-logo-navbar.png"), width=662, height=146)
  require_valid_image(context.project_reader.get_global_resource("slycat-logo-navbar.png"), width=662, height=146)
  require_valid_image(context.project_outsider.get_global_resource("slycat-logo-navbar.png"), width=662, height=146)
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^401"):
    context.unauthenticated_user.get_global_resource("slycat-logo-navbar.png")

@then(u'server administrators can retrieve the model.')
def step_impl(context):
  require_valid_model(context.server_admin.get_model(context.mid), name="Test", mtype="generic", creator=context.project_admin_user)

@then(u'project administrators can retrieve the model.')
def step_impl(context):
  require_valid_model(context.project_admin.get_model(context.mid), name="Test", mtype="generic", creator=context.project_admin_user)

@then(u'project writers can retrieve the model.')
def step_impl(context):
  require_valid_model(context.project_writer.get_model(context.mid), name="Test", mtype="generic", creator=context.project_admin_user)

@then(u'project readers can retrieve the model.')
def step_impl(context):
  require_valid_model(context.project_reader.get_model(context.mid), name="Test", mtype="generic", creator=context.project_admin_user)

@then(u'project outsiders cannot retrieve the model.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_outsider.get_model(context.mid)

@then(u'unauthenticated clients cannot retrieve the model.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^401"):
    context.unauthenticated_user.get_model(context.mid)

@then(u'any authenticated user can request a model resource.')
def step_impl(context):
  require_valid_image(context.server_admin.get_model_resource("cca", "images/sort-asc-gray.png"), width=9, height=5)
  require_valid_image(context.project_admin.get_model_resource("cca", "images/sort-asc-gray.png"), width=9, height=5)
  require_valid_image(context.project_writer.get_model_resource("cca", "images/sort-asc-gray.png"), width=9, height=5)
  require_valid_image(context.project_reader.get_model_resource("cca", "images/sort-asc-gray.png"), width=9, height=5)
  require_valid_image(context.project_outsider.get_model_resource("cca", "images/sort-asc-gray.png"), width=9, height=5)
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^401"):
    context.unauthenticated_user.get_model_resource("cca", "images/sort-asc-gray.png")

@then(u'any authenticated user can request a wizard resource.')
def step_impl(context):
  nose.tools.assert_regexp_matches(context.server_admin.get_wizard_resource("slycat-create-project", "ui.html"), "^<div")
  nose.tools.assert_regexp_matches(context.project_admin.get_wizard_resource("slycat-create-project", "ui.html"), "^<div")
  nose.tools.assert_regexp_matches(context.project_writer.get_wizard_resource("slycat-create-project", "ui.html"), "^<div")
  nose.tools.assert_regexp_matches(context.project_reader.get_wizard_resource("slycat-create-project", "ui.html"), "^<div")
  nose.tools.assert_regexp_matches(context.project_outsider.get_wizard_resource("slycat-create-project", "ui.html"), "^<div")
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^401"):
    context.unauthenticated_user.get_wizard_resource("slycat-create-project", "ui.html")

@then(u'server administrators can retrieve the list of project models.')
def step_impl(context):
  require_list(context.server_admin.get_project_models(context.pid), length=2, item_test=require_valid_model)

@then(u'project administrators can retrieve the list of project models.')
def step_impl(context):
  require_list(context.project_admin.get_project_models(context.pid), length=2, item_test=require_valid_model)

@then(u'project writers can retrieve the list of project models.')
def step_impl(context):
  require_list(context.project_writer.get_project_models(context.pid), length=2, item_test=require_valid_model)

@then(u'project readers can retrieve the list of project models.')
def step_impl(context):
  require_list(context.project_reader.get_project_models(context.pid), length=2, item_test=require_valid_model)

@then(u'project outsiders cannot retrieve the list of project models.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_outsider.get_project_models(context.pid)

@then(u'unauthenticated clients cannot retrieve the list of project models.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^401"):
    context.unauthenticated_user.get_project_models(context.pid)

@given(u'a saved bookmark.')
def step_impl(context):
  context.rid = context.project_admin.post_project_references(context.pid, "Test", mtype="generic", mid=context.mid, bid=context.bid)

@given(u'a saved template.')
def step_impl(context):
  context.rid = context.project_admin.post_project_references(context.pid, "Test", mtype="generic", bid=context.bid)

@when(u'a client retrieves the project references.')
def step_impl(context):
  context.references = context.project_admin.get_project_references(context.pid)

@then(u'the server should return the project references.')
def step_impl(context):
  require_list(context.references, length=2, item_test=require_valid_reference)

@then(u'server administrators can retrieve the project.')
def step_impl(context):
  project = require_valid_project(context.server_admin.get_project(context.pid), name="Test", description="Description.", creator=context.project_admin_user)

@then(u'project administrators can retrieve the project.')
def step_impl(context):
  project = require_valid_project(context.project_admin.get_project(context.pid), name="Test", description="Description.", creator=context.project_admin_user)

@then(u'project writers can retrieve the project.')
def step_impl(context):
  project = require_valid_project(context.project_writer.get_project(context.pid), name="Test", description="Description.", creator=context.project_admin_user)

@then(u'project readers can retrieve the project.')
def step_impl(context):
  project = require_valid_project(context.project_reader.get_project(context.pid), name="Test", description="Description.", creator=context.project_admin_user)

@then(u'project outsiders cannot retrieve the project.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_outsider.get_project(context.pid)

@then(u'unauthenticated clients cannot retrieve the project.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^401"):
    context.unauthenticated_user.get_project(context.pid)

@then(u'server administrators can retrieve a list with all three projects.')
def step_impl(context):
  require_list(context.server_admin.get_projects()["projects"], item_test=require_valid_project, includes=[context.pid2, context.pid3, context.pid4], excludes=[])

@then(u'project administrators can retrieve a list with all three projects.')
def step_impl(context):
  require_list(context.project_admin.get_projects()["projects"], item_test=require_valid_project, includes=[context.pid2, context.pid3, context.pid4], excludes=[])

@then(u'project writers can retrieve a list with two projects.')
def step_impl(context):
  require_list(context.project_writer.get_projects()["projects"], item_test=require_valid_project, includes=[context.pid2, context.pid3], excludes=[context.pid4])

@then(u'project readers can retrieve a list with one project.')
def step_impl(context):
  require_list(context.project_reader.get_projects()["projects"], item_test=require_valid_project, includes=[context.pid2], excludes=[context.pid3, context.pid4])

@then(u'project outsiders can retrieve a list containing none of the projects.')
def step_impl(context):
  require_list(context.project_outsider.get_projects()["projects"], item_test=require_valid_project, includes=[], excludes=[context.pid2, context.pid3, context.pid4])

@then(u'unauthenticated clients cannot retrieve the list of projects.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^401"):
    context.unauthenticated_user.get_projects()

@then(u'any authenticated user can retrieve information about themselves.')
def step_impl(context):
  require_valid_user(context.server_admin.get_user(), uid=context.server_admin_user)
  require_valid_user(context.project_admin.get_user(), uid=context.project_admin_user)
  require_valid_user(context.project_writer.get_user(), uid=context.project_writer_user)
  require_valid_user(context.project_reader.get_user(), uid=context.project_reader_user)
  require_valid_user(context.project_outsider.get_user(), uid=context.project_outsider_user)
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^401"):
    context.unauthenticated_user.get_user()

@then(u'any authenticated user can retrieve information about another user.')
def step_impl(context):
  require_valid_user(context.server_admin.get_user("foobar"), uid="foobar")
  require_valid_user(context.project_admin.get_user("foobar"), uid="foobar")
  require_valid_user(context.project_writer.get_user("foobar"), uid="foobar")
  require_valid_user(context.project_reader.get_user("foobar"), uid="foobar")
  require_valid_user(context.project_outsider.get_user("foobar"), uid="foobar")
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^401"):
    context.unauthenticated_user.get_user("foobar")

@then(u'server administrators can save a bookmark.')
def step_impl(context):
  bid = context.server_admin.post_project_bookmarks(context.pid, sample_bookmark)
  nose.tools.assert_equal(context.server_admin.get_bookmark(bid), sample_bookmark)

@then(u'project administrators can save a bookmark.')
def step_impl(context):
  bid = context.project_admin.post_project_bookmarks(context.pid, sample_bookmark)
  nose.tools.assert_equal(context.project_admin.get_bookmark(bid), sample_bookmark)

@then(u'project writers can save a bookmark.')
def step_impl(context):
  bid = context.project_writer.post_project_bookmarks(context.pid, sample_bookmark)
  nose.tools.assert_equal(context.project_writer.get_bookmark(bid), sample_bookmark)

@then(u'project readers can save a bookmark.')
def step_impl(context):
  bid = context.project_reader.post_project_bookmarks(context.pid, sample_bookmark)
  nose.tools.assert_equal(context.project_reader.get_bookmark(bid), sample_bookmark)

@then(u'project outsiders cannot save a bookmark.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_outsider.post_project_bookmarks(context.pid, sample_bookmark)

@then(u'unauthenticated users cannot save a bookmark.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^401"):
    context.unauthenticated_user.post_project_bookmarks(context.pid, sample_bookmark)

@when(u'a client creates a saved bookmark.')
def step_impl(context):
  context.rid = context.project_admin.post_project_references(context.pid, "Test", mtype="generic", mid=context.mid, bid=context.bid)

@then(u'the saved bookmark should be created.')
def step_impl(context):
  context.references = context.project_admin.get_project_references(context.pid)
  require_list(context.references, length=1, item_test=require_valid_reference)
  nose.tools.assert_equal(context.references[0]["bid"], context.bid)
  nose.tools.assert_equal(context.references[0]["creator"], context.project_admin_user)
  nose.tools.assert_equal(context.references[0]["mid"], context.mid)
  nose.tools.assert_equal(context.references[0]["model-type"], "generic")
  nose.tools.assert_equal(context.references[0]["name"], "Test")
  nose.tools.assert_equal(context.references[0]["project"], context.pid)

@when(u'a client creates a template.')
def step_impl(context):
  context.rid = context.project_admin.post_project_references(context.pid, "Test", mtype="generic", bid=context.bid)

@then(u'the template should be created.')
def step_impl(context):
  context.references = context.project_admin.get_project_references(context.pid)
  require_list(context.references, length=1, item_test=require_valid_reference)
  nose.tools.assert_equal(context.references[0]["bid"], context.bid)
  nose.tools.assert_equal(context.references[0]["creator"], context.project_admin_user)
  nose.tools.assert_equal(context.references[0]["mid"], None)
  nose.tools.assert_equal(context.references[0]["model-type"], "generic")
  nose.tools.assert_equal(context.references[0]["name"], "Test")
  nose.tools.assert_equal(context.references[0]["project"], context.pid)

@when(u'a client creates a new model.')
def step_impl(context):
  context.mid = context.project_admin.post_project_models(context.pid, "generic", "Test", marking="", description="Description.")

@then(u'the model should be created.')
def step_impl(context):
  context.model = require_valid_model(context.project_admin.get_model(context.mid))
  nose.tools.assert_equal(context.model["creator"], context.project_admin_user)
  nose.tools.assert_equal(context.model["description"], "Description.")
  nose.tools.assert_equal(context.model["marking"], "")
  nose.tools.assert_equal(context.model["name"], "Test")
  nose.tools.assert_equal(context.model["model-type"], "generic")
  nose.tools.assert_equal(context.model["artifact-types"], {})
  nose.tools.assert_equal(context.model["input-artifacts"], [])
  nose.tools.assert_equal(context.model["project"], context.pid)
  nose.tools.assert_equal(context.model["started"], None)
  nose.tools.assert_equal(context.model["finished"], None)
  nose.tools.assert_equal(context.model["state"], "waiting")
  nose.tools.assert_equal(context.model["result"], None)
  nose.tools.assert_equal(context.model["progress"], None)
  nose.tools.assert_equal(context.model["message"], None)

@when(u'a client creates a new project.')
def step_impl(context):
  context.pid = context.project_admin.post_projects("Test", "Description.")

@then(u'the project should be created.')
def step_impl(context):
  context.project = require_valid_project(context.project_admin.get_project(context.pid))
  nose.tools.assert_equal(context.project["acl"]["administrators"], [{"user":context.project_admin_user}])
  nose.tools.assert_equal(context.project["acl"]["readers"], [])
  nose.tools.assert_equal(context.project["acl"]["writers"], [])
  nose.tools.assert_equal(context.project["creator"], context.project_admin_user)
  nose.tools.assert_equal(context.project["description"], "Description.")
  nose.tools.assert_equal(context.project["name"], "Test")

@when(u'a client creates a new remote session.')
def step_impl(context):
  context.sid = context.project_admin.post_remotes(context.remote_host, context.remote_user, context.remote_password)

@then(u'the remote session should be created.')
def step_impl(context):
  require_valid_browse(context.project_admin.post_remote_browse(context.sid, "/"))

@when(u'a client adds a new arrayset to the model.')
def step_impl(context):
  context.project_admin.put_model_arrayset(context.mid, "arrayset")

@then(u'the model should contain the new arrayset.')
def step_impl(context):
  model = require_valid_model(context.project_admin.get_model(context.mid))
  nose.tools.assert_in("arrayset", model["artifact-types"])
  nose.tools.assert_equal(model["artifact-types"]["arrayset"], "hdf5")
  nose.tools.assert_in("artifact:arrayset", model)

@then(u'the new arrayset should be empty.')
def step_impl(context):
  nose.tools.assert_equal(context.project_admin.get_model_arrayset_metadata(context.mid, "arrayset", arrays="..."), {"arrays":[]})

@when(u'the client adds an array to the arrayset.')
def step_impl(context):
  context.project_admin.put_model_arrayset_array(context.mid, "arrayset", 0, [{"name":"row", "end":10}], [{"name":"string", "type":"string"}])

@then(u'the arrayset should contain the new array.')
def step_impl(context):
  nose.tools.assert_equal(context.project_admin.get_model_arrayset_metadata(context.mid, "arrayset", arrays="..."), {u'arrays': [{u'attributes': [{u'name': u'string', u'type': u'string'}], u'dimensions': [{u'begin': 0, u'end': 10, u'name': u'row', u'type': u'int64'}], u'index': 0, u'shape': [10]}]})

@given(u'the model has a parameter.')
def step_impl(context):
  context.project_admin.put_model_parameter(context.mid, "pi", 3.14159)

@given(u'the model has an arrayset.')
def step_impl(context):
  context.project_admin.put_model_arrayset(context.mid, "arrayset")

@given(u'the model has a file.')
def step_impl(context):
  context.project_admin.post_model_files(context.mid, ["file"], ["Hello, world!"], parser="slycat-blob-parser", parameters={"content-type":"text/plain"})

@when(u'the client copies the artifacts to the second model.')
def step_impl(context):
  context.project_admin.put_model_inputs(context.mid, context.mid2)

@then(u'the model should contain the same set of artifacts.')
def step_impl(context):
  model = require_valid_model(context.project_admin.get_model(context.mid2))
  nose.tools.assert_equal(model["artifact-types"], {"pi":"json", "arrayset":"hdf5", "file":"file"})
  nose.tools.assert_items_equal(model["input-artifacts"], ["arrayset", "pi", "file"])
  nose.tools.assert_equal(context.project_admin.get_model_parameter(context.mid2, "pi"), 3.14159)
  nose.tools.assert_equal(context.project_admin.get_model_arrayset_metadata(context.mid2, "arrayset", arrays="..."), {"arrays":[]})

@when(u'a client modifies the model.')
def step_impl(context):
  context.project_admin.put_model(context.mid, {"name":"MyModel", "description":"My description.", "state":"finished", "result":"succeeded", "progress":1.0, "message":"Done!", "started":datetime.datetime.utcnow().isoformat(), "finished":datetime.datetime.utcnow().isoformat()})

@then(u'the model should be modified.')
def step_impl(context):
  context.model = require_valid_model(context.project_admin.get_model(context.mid))
  nose.tools.assert_equal(context.model["name"], "MyModel")
  nose.tools.assert_equal(context.model["description"], "My description.")
  nose.tools.assert_equal(context.model["state"], "finished")
  nose.tools.assert_equal(context.model["result"], "succeeded")
  nose.tools.assert_equal(context.model["progress"], 1.0)
  nose.tools.assert_equal(context.model["message"], "Done!")
  require_valid_timestamp(context.model["started"])
  require_valid_timestamp(context.model["finished"])

@when(u'a client stores a model parameter artifact.')
def step_impl(context):
  context.project_admin.put_model_parameter(context.mid, "foo", {"bar":"baz", "blah":5, "biff":[1, 2, 3]})
  require_valid_model(context.project_admin.get_model(context.mid))

@then(u'the client can retrieve the model parameter artifact.')
def step_impl(context):
  nose.tools.assert_equal(context.project_admin.get_model_parameter(context.mid, "foo"), {"bar":"baz", "blah":5, "biff":[1, 2, 3]})

@when(u'a client modifies the project.')
def step_impl(context):
  context.project_admin.put_project(context.pid, {"name":"MyProject", "description":"My description.", "acl":{"administrators":[{"user":context.project_admin_user}], "writers":[{"user":"foo"}], "readers":[{"user":"baz"}]}})

@then(u'the project should be modified.')
def step_impl(context):
  context.project = require_valid_project(context.project_admin.get_project(context.pid))
  nose.tools.assert_equal(context.project["name"], "MyProject")
  nose.tools.assert_equal(context.project["description"], "My description.")
  nose.tools.assert_equal(context.project["acl"]["administrators"], [{"user":context.project_admin_user}])
  nose.tools.assert_equal(context.project["acl"]["writers"], [{"user":"foo"}])
  nose.tools.assert_equal(context.project["acl"]["readers"], [{"user":"baz"}])

@then(u'server administrators can modify the project acl, name, and description.')
def step_impl(context):
  context.server_admin.put_project(context.pid, {"name":"ServerAdmin", "description":"ServerAdmin description.", "acl":{"administrators":[{"user":context.project_admin_user}], "writers":[{"user":context.project_writer_user}], "readers":[{"user":context.project_reader_user}]}})
  nose.tools.assert_equal(context.server_admin.get_project(context.pid)["name"], "ServerAdmin")
  nose.tools.assert_equal(context.server_admin.get_project(context.pid)["description"], "ServerAdmin description.")

@then(u'project administrators can modify the project acl, name, and description.')
def step_impl(context):
  context.project_admin.put_project(context.pid, {"name":"ProjectAdmin", "description":"ProjectAdmin description.", "acl":{"administrators":[{"user":context.project_admin_user}], "writers":[{"user":context.project_writer_user}], "readers":[{"user":context.project_reader_user}]}})
  nose.tools.assert_equal(context.server_admin.get_project(context.pid)["name"], "ProjectAdmin")
  nose.tools.assert_equal(context.server_admin.get_project(context.pid)["description"], "ProjectAdmin description.")

@then(u'project writers can modify the project name and description only.')
def step_impl(context):
  context.project_writer.put_project(context.pid, {"name":"ProjectWriter", "description":"ProjectWriter description."})
  nose.tools.assert_equal(context.server_admin.get_project(context.pid)["name"], "ProjectWriter")
  nose.tools.assert_equal(context.server_admin.get_project(context.pid)["description"], "ProjectWriter description.")
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_writer.put_project(context.pid, {"acl":{"administrators":[{"user":context.project_admin_user}], "writers":[{"user":context.project_writer_user}], "readers":[{"user":context.project_reader_user}]}})

@then(u'project readers cannot modify the project.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_reader.put_project(context.pid, {"Name":"ProjectReader"})
  nose.tools.assert_equal(context.server_admin.get_project(context.pid)["name"], "ProjectWriter")

@then(u'project outsiders cannot modify the project.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_outsider.put_project(context.pid, {"Name":"ProjectOutsider"})
  nose.tools.assert_equal(context.server_admin.get_project(context.pid)["name"], "ProjectWriter")

@then(u'unauthenticated users cannot modify the project.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^401"):
    context.unauthenticated_user.put_project(context.pid, {"Name":"UnauthenticatedUser"})
  nose.tools.assert_equal(context.server_admin.get_project(context.pid)["name"], "ProjectWriter")


