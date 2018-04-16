# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

from behave import *

import cherrypy
import datetime
import nose.tools
import PIL.Image
import slycat.web.client
import StringIO
import xml.etree.ElementTree as xml

sample_bookmark = {"foo":"bar", "baz":5, "blah":[1, 2, 3]}
sample_model_parameter_artifact = {"foo":"bar", "baz":5, "blah":[1, 2, 3]}
sample_model_file_artifact = "Hello, World!"

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

@given(u'a running Slycat server.')
def step_impl(context):
  context.server_admin = slycat.web.client.Connection(host=context.server_host, verify=False, proxies={"http":context.server_proxy, "https":context.server_proxy}, auth=(context.server_admin_user, context.server_admin_password))
  context.project_admin = slycat.web.client.Connection(host=context.server_host, verify=False, proxies={"http":context.server_proxy, "https":context.server_proxy}, auth=(context.project_admin_user, context.project_admin_password))
  context.project_writer = slycat.web.client.Connection(host=context.server_host, verify=False, proxies={"http":context.server_proxy, "https":context.server_proxy}, auth=(context.project_writer_user, context.project_writer_password))
  context.project_reader = slycat.web.client.Connection(host=context.server_host, verify=False, proxies={"http":context.server_proxy, "https":context.server_proxy}, auth=(context.project_reader_user, context.project_reader_password))
  context.project_outsider = slycat.web.client.Connection(host=context.server_host, verify=False, proxies={"http":context.server_proxy, "https":context.server_proxy}, auth=(context.project_outsider_user, context.project_outsider_password))
  try:
    context.unauthenticated_user = slycat.web.client.Connection(host=context.server_host, verify=False, proxies={"http":context.server_proxy, "https":context.server_proxy})
  except:
    context.unauthenticated_user = None
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

@given(u'the model has a parameter artifact.')
def step_impl(context):
  context.project_admin.put_model_parameter(context.mid, "parameter", sample_model_parameter_artifact)

@given(u'the model has an arrayset artifact.')
def step_impl(context):
  context.project_admin.put_model_arrayset(context.mid, "arrayset")

@given(u'the model has a file artifact.')
def step_impl(context):
  context.project_admin.post_model_files(context.mid, ["file"], [sample_model_file_artifact], parser="slycat-blob-parser", parameters={"content-type":"text/plain"})

@given(u'a second generic model.')
def step_impl(context):
  context.mid2 = context.project_admin.post_project_models(context.pid, "generic", "Test2", description="Description2.")

@given(u'a sample bookmark.')
def step_impl(context):
  context.bid = context.project_admin.post_project_bookmarks(context.pid, sample_bookmark)

@given(u'a saved bookmark.')
def step_impl(context):
  context.rid = context.project_admin.post_project_references(context.pid, "Test", mtype="generic", mid=context.mid, bid=context.bid)

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
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

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
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@then(u'server administrators can delete the saved bookmark.')
def step_impl(context):
  context.server_admin.delete_reference(context.rid)

@then(u'the saved bookmark no longer exists.')
def step_impl(context):
  nose.tools.assert_not_in(context.rid, [reference["_id"] for reference in context.server_admin.get_project_references(context.pid)])

@then(u'project administrators can delete the saved bookmark.')
def step_impl(context):
  context.project_admin.delete_reference(context.rid)

@then(u'project writers can delete the saved bookmark.')
def step_impl(context):
  context.project_writer.delete_reference(context.rid)

@then(u'project readers cannot delete the saved bookmark.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_reader.delete_reference(context.rid)

@then(u'the saved bookmark still exists.')
def step_impl(context):
  nose.tools.assert_in(context.rid, [reference["_id"] for reference in context.server_admin.get_project_references(context.pid)])

@then(u'project outsiders cannot delete the saved bookmark.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_outsider.delete_reference(context.rid)

@then(u'unauthenticated users cannot delete the saved bookmark.')
def step_impl(context):
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@when(u'a client deletes the remote session.')
def step_impl(context):
  context.project_admin.delete_remote(context.sid)

@then(u'the remote session should no longer exist.')
def step_impl(context):
  with nose.tools.assert_raises(Exception) as raised:
    context.project_admin.post_remote_browse(context.sid, "/")
    nose.tools.assert_equal(raised.exception.code, 404)

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
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@then(u'Any authenticated user can request the set of available markings.')
def step_impl(context):
  require_list(context.server_admin.get_configuration_markings(), item_test=require_valid_marking)
  require_list(context.project_admin.get_configuration_markings(), item_test=require_valid_marking)
  require_list(context.project_writer.get_configuration_markings(), item_test=require_valid_marking)
  require_list(context.project_reader.get_configuration_markings(), item_test=require_valid_marking)
  require_list(context.project_outsider.get_configuration_markings(), item_test=require_valid_marking)
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@then(u'Any authenticated user can request the set of available parsers.')
def step_impl(context):
  require_list(context.server_admin.get_configuration_parsers(), item_test=require_valid_parser)
  require_list(context.project_admin.get_configuration_parsers(), item_test=require_valid_parser)
  require_list(context.project_writer.get_configuration_parsers(), item_test=require_valid_parser)
  require_list(context.project_reader.get_configuration_parsers(), item_test=require_valid_parser)
  require_list(context.project_outsider.get_configuration_parsers(), item_test=require_valid_parser)
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@then(u'Any authenticated user can request the set of remote hosts.')
def step_impl(context):
  require_list(context.server_admin.get_configuration_remote_hosts(), item_test=require_valid_remote_host)
  require_list(context.project_admin.get_configuration_remote_hosts(), item_test=require_valid_remote_host)
  require_list(context.project_writer.get_configuration_remote_hosts(), item_test=require_valid_remote_host)
  require_list(context.project_reader.get_configuration_remote_hosts(), item_test=require_valid_remote_host)
  require_list(context.project_outsider.get_configuration_remote_hosts(), item_test=require_valid_remote_host)
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@then(u'Any authenticated user can request the support email.')
def step_impl(context):
  require_valid_support_email(context.server_admin.get_configuration_support_email())
  require_valid_support_email(context.project_admin.get_configuration_support_email())
  require_valid_support_email(context.project_writer.get_configuration_support_email())
  require_valid_support_email(context.project_reader.get_configuration_support_email())
  require_valid_support_email(context.project_outsider.get_configuration_support_email())
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@then(u'Any authenticated user can request the server version.')
def step_impl(context):
  require_valid_version(context.server_admin.get_configuration_version())
  require_valid_version(context.project_admin.get_configuration_version())
  require_valid_version(context.project_writer.get_configuration_version())
  require_valid_version(context.project_reader.get_configuration_version())
  require_valid_version(context.project_outsider.get_configuration_version())
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@then(u'Any authenticated user can request the set of available wizards.')
def step_impl(context):
  require_list(context.server_admin.get_configuration_wizards(), item_test=require_valid_wizard)
  require_list(context.project_admin.get_configuration_wizards(), item_test=require_valid_wizard)
  require_list(context.project_writer.get_configuration_wizards(), item_test=require_valid_wizard)
  require_list(context.project_reader.get_configuration_wizards(), item_test=require_valid_wizard)
  require_list(context.project_outsider.get_configuration_wizards(), item_test=require_valid_wizard)
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@then(u'any authenticated user can request a global resource.')
def step_impl(context):
  require_valid_image(context.server_admin.get_global_resource("slycat-logo-navbar.png"), width=662, height=146)
  require_valid_image(context.project_admin.get_global_resource("slycat-logo-navbar.png"), width=662, height=146)
  require_valid_image(context.project_writer.get_global_resource("slycat-logo-navbar.png"), width=662, height=146)
  require_valid_image(context.project_reader.get_global_resource("slycat-logo-navbar.png"), width=662, height=146)
  require_valid_image(context.project_outsider.get_global_resource("slycat-logo-navbar.png"), width=662, height=146)
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@then(u'server administrators can retrieve the model file artifact.')
def step_impl(context):
  nose.tools.assert_equal(context.server_admin.get_model_file(context.mid, "file"), sample_model_file_artifact)

@then(u'project administrators can retrieve the model file artifact.')
def step_impl(context):
  nose.tools.assert_equal(context.project_admin.get_model_file(context.mid, "file"), sample_model_file_artifact)

@then(u'project writers can retrieve the model file artifact.')
def step_impl(context):
  nose.tools.assert_equal(context.project_writer.get_model_file(context.mid, "file"), sample_model_file_artifact)

@then(u'project readers can retrieve the model file artifact.')
def step_impl(context):
  nose.tools.assert_equal(context.project_reader.get_model_file(context.mid, "file"), sample_model_file_artifact)

@then(u'project outsiders cannot retrieve the model file artifact.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_outsider.get_model_file(context.mid, "file")

@then(u'unauthenticated clients cannot retrieve the model file artifact.')
def step_impl(context):
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@then(u'retrieving a nonexistent file artifact returns 404.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^404"):
    context.server_admin.get_model_file(context.mid, "nonexistent-artifact")

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
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@then(u'server administrators can retrieve the model parameter artifact.')
def step_impl(context):
  nose.tools.assert_equal(context.server_admin.get_model_parameter(context.mid, "parameter"), sample_model_parameter_artifact)

@then(u'project administrators can retrieve the model parameter artifact.')
def step_impl(context):
  nose.tools.assert_equal(context.project_admin.get_model_parameter(context.mid, "parameter"), sample_model_parameter_artifact)

@then(u'project writers can retrieve the model parameter artifact.')
def step_impl(context):
  nose.tools.assert_equal(context.project_writer.get_model_parameter(context.mid, "parameter"), sample_model_parameter_artifact)

@then(u'project readers can retrieve the model parameter artifact.')
def step_impl(context):
  nose.tools.assert_equal(context.project_reader.get_model_parameter(context.mid, "parameter"), sample_model_parameter_artifact)

@then(u'project outsiders cannot retrieve the model parameter artifact.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_outsider.get_model_parameter(context.mid, "parameter")

@then(u'unauthenticated clients cannot retrieve the model parameter artifact.')
def step_impl(context):
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@then(u'retrieving a nonexistent parameter returns 404.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^404"):
    context.server_admin.get_model_parameter(context.mid, "nonexistent-artifact")

@then(u'any authenticated user can request a model resource.')
def step_impl(context):
  require_valid_image(context.server_admin.get_model_resource("cca", "images/sort-asc-gray.png"), width=9, height=5)
  require_valid_image(context.project_admin.get_model_resource("cca", "images/sort-asc-gray.png"), width=9, height=5)
  require_valid_image(context.project_writer.get_model_resource("cca", "images/sort-asc-gray.png"), width=9, height=5)
  require_valid_image(context.project_reader.get_model_resource("cca", "images/sort-asc-gray.png"), width=9, height=5)
  require_valid_image(context.project_outsider.get_model_resource("cca", "images/sort-asc-gray.png"), width=9, height=5)
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@then(u'any authenticated user can request a wizard resource.')
def step_impl(context):
  nose.tools.assert_regexp_matches(context.server_admin.get_wizard_resource("slycat-create-project", "ui.html"), "^<div")
  nose.tools.assert_regexp_matches(context.project_admin.get_wizard_resource("slycat-create-project", "ui.html"), "^<div")
  nose.tools.assert_regexp_matches(context.project_writer.get_wizard_resource("slycat-create-project", "ui.html"), "^<div")
  nose.tools.assert_regexp_matches(context.project_reader.get_wizard_resource("slycat-create-project", "ui.html"), "^<div")
  nose.tools.assert_regexp_matches(context.project_outsider.get_wizard_resource("slycat-create-project", "ui.html"), "^<div")
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

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
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@then(u'server administrators can create a saved bookmark.')
def step_impl(context):
  context.rid = context.server_admin.post_project_references(context.pid, "Test", mtype="generic", mid=context.mid, bid=context.bid)

@then(u'project administrators can create a saved bookmark.')
def step_impl(context):
  context.rid = context.project_admin.post_project_references(context.pid, "Test", mtype="generic", mid=context.mid, bid=context.bid)

@then(u'project writers can create a saved bookmark.')
def step_impl(context):
  context.rid = context.project_writer.post_project_references(context.pid, "Test", mtype="generic", mid=context.mid, bid=context.bid)

@then(u'project readers cannot create a saved bookmark.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_reader.post_project_references(context.pid, "Test", mtype="generic", mid=context.mid, bid=context.bid)

@then(u'project outsiders cannot create a saved bookmark.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_outsider.post_project_references(context.pid, "Test", mtype="generic", mid=context.mid, bid=context.bid)

@then(u'unauthenticated users cannot create a saved bookmark.')
def step_impl(context):
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@then(u'server administrators can create a bookmark template.')
def step_impl(context):
  context.rid = context.server_admin.post_project_references(context.pid, "Test", mtype="generic", bid=context.bid)

@then(u'project administrators can create a bookmark template.')
def step_impl(context):
  context.rid = context.project_admin.post_project_references(context.pid, "Test", mtype="generic", bid=context.bid)

@then(u'project writers can create a bookmark template.')
def step_impl(context):
  context.rid = context.project_writer.post_project_references(context.pid, "Test", mtype="generic", bid=context.bid)

@then(u'project readers cannot create a bookmark template.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_reader.post_project_references(context.pid, "Test", mtype="generic", bid=context.bid)

@then(u'project outsiders cannot create a bookmark template.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_outsider.post_project_references(context.pid, "Test", mtype="generic", bid=context.bid)

@then(u'unauthenticated users cannot create a bookmark template.')
def step_impl(context):
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@then(u'server administrators can retrieve the list of project references.')
def step_impl(context):
  require_list(context.server_admin.get_project_references(context.pid), length=1, item_test=require_valid_reference)

@then(u'project administrators can retrieve the list of project references.')
def step_impl(context):
  require_list(context.project_admin.get_project_references(context.pid), length=1, item_test=require_valid_reference)

@then(u'project writers can retrieve the list of project references.')
def step_impl(context):
  require_list(context.project_writer.get_project_references(context.pid), length=1, item_test=require_valid_reference)

@then(u'project readers can retrieve the list of project references.')
def step_impl(context):
  require_list(context.project_reader.get_project_references(context.pid), length=1, item_test=require_valid_reference)

@then(u'project outsiders cannot retrieve the list of project references.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_outsider.get_project_references(context.pid)

@then(u'unauthenticated clients cannot retrieve the list of project references.')
def step_impl(context):
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

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
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

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
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@then(u'any authenticated user can retrieve information about themselves.')
def step_impl(context):
  require_valid_user(context.server_admin.get_user(), uid=context.server_admin_user)
  require_valid_user(context.project_admin.get_user(), uid=context.project_admin_user)
  require_valid_user(context.project_writer.get_user(), uid=context.project_writer_user)
  require_valid_user(context.project_reader.get_user(), uid=context.project_reader_user)
  require_valid_user(context.project_outsider.get_user(), uid=context.project_outsider_user)
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@then(u'any authenticated user can retrieve information about another user.')
def step_impl(context):
  require_valid_user(context.server_admin.get_user("foobar"), uid="foobar")
  require_valid_user(context.project_admin.get_user("foobar"), uid="foobar")
  require_valid_user(context.project_writer.get_user("foobar"), uid="foobar")
  require_valid_user(context.project_reader.get_user("foobar"), uid="foobar")
  require_valid_user(context.project_outsider.get_user("foobar"), uid="foobar")
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@then(u'authenticated users can log events.')
def step_impl(context):
  context.server_admin.post_events("test")
  context.project_admin.post_events("test")
  context.project_writer.post_events("test")
  context.project_reader.post_events("test")
  context.project_outsider.post_events("test")

@then(u'unauthenticated users cannot log events.')
def step_impl(context):
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@then(u'server administrators can upload a file.')
def step_impl(context):
  context.server_admin.post_model_files(context.mid, ["file"], ["Hello, world!"], parser="slycat-blob-parser", parameters={"content-type":"text/plain"})

@then(u'the model will contain a new file artifact.')
def step_impl(context):
  model = require_valid_model(context.server_admin.get_model(context.mid))
  nose.tools.assert_in("file", model["artifact-types"])
  nose.tools.assert_in("file", model["input-artifacts"])
  nose.tools.assert_equal(model["artifact-types"]["file"], "file")

@then(u'project administrators can upload a file.')
def step_impl(context):
  context.project_admin.post_model_files(context.mid, ["file"], ["Hello, world!"], parser="slycat-blob-parser", parameters={"content-type":"text/plain"})

@then(u'project writers can upload a file.')
def step_impl(context):
  context.project_writer.post_model_files(context.mid, ["file"], ["Hello, world!"], parser="slycat-blob-parser", parameters={"content-type":"text/plain"})

@then(u'project readers cannot upload a file.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_reader.post_model_files(context.mid, ["file"], ["Hello, world!"], parser="slycat-blob-parser", parameters={"content-type":"text/plain"})

@then(u'the model will not contain a new file artifact.')
def step_impl(context):
  model = require_valid_model(context.server_admin.get_model(context.mid))
  nose.tools.assert_not_in("file", model["artifact-types"])
  nose.tools.assert_not_in("file", model["input-artifacts"])

@then(u'project outsiders cannot upload a file.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_outsider.post_model_files(context.mid, ["file"], ["Hello, world!"], parser="slycat-blob-parser", parameters={"content-type":"text/plain"})

@then(u'unauthenticated users cannot upload a file.')
def step_impl(context):
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@then(u'server administrators can finish the model.')
def step_impl(context):
  context.server_admin.post_model_finish(context.mid)

@then(u'the model will be finished.')
def step_impl(context):
  context.server_admin.join_model(context.mid)
  model = require_valid_model(context.server_admin.get_model(context.mid))
  nose.tools.assert_equal(model["state"], "finished")

@then(u'project administrators can finish the model.')
def step_impl(context):
  context.project_admin.post_model_finish(context.mid)

@then(u'project writers can finish the model.')
def step_impl(context):
  context.project_writer.post_model_finish(context.mid)

@then(u'project readers cannot finish the model.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_reader.post_model_finish(context.mid)

@then(u'the model will remain unfinished.')
def step_impl(context):
  model = require_valid_model(context.server_admin.get_model(context.mid))
  nose.tools.assert_equal(model["state"], "waiting")

@then(u'project outsiders cannot finish the model.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_outsider.post_model_finish(context.mid)

@then(u'unauthenticated users cannot finish the model.')
def step_impl(context):
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

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
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

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

@then(u'server administrators can create a new model.')
def step_impl(context):
  context.mid = context.server_admin.post_project_models(context.pid, "generic", "Test", marking="", description="Description.")

@then(u'the project contains a new model.')
def step_impl(context):
  model = require_valid_model(context.server_admin.get_model(context.mid))
  nose.tools.assert_equal(model["description"], "Description.")
  nose.tools.assert_equal(model["marking"], "")
  nose.tools.assert_equal(model["name"], "Test")
  nose.tools.assert_equal(model["model-type"], "generic")
  nose.tools.assert_equal(model["artifact-types"], {})
  nose.tools.assert_equal(model["input-artifacts"], [])
  nose.tools.assert_equal(model["project"], context.pid)
  nose.tools.assert_equal(model["started"], None)
  nose.tools.assert_equal(model["finished"], None)
  nose.tools.assert_equal(model["state"], "waiting")
  nose.tools.assert_equal(model["result"], None)
  nose.tools.assert_equal(model["progress"], None)
  nose.tools.assert_equal(model["message"], None)

@then(u'project administrators can create a new model.')
def step_impl(context):
  context.mid = context.project_admin.post_project_models(context.pid, "generic", "Test", marking="", description="Description.")

@then(u'project writers can create a new model.')
def step_impl(context):
  context.mid = context.project_writer.post_project_models(context.pid, "generic", "Test", marking="", description="Description.")

@then(u'project readers cannot create a new model.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_reader.post_project_models(context.pid, "generic", "Test", marking="", description="Description.")

@then(u'the project doesn\'t contain a new model.')
def step_impl(context):
  require_list(context.server_admin.get_project_models(context.pid), length=0)

@then(u'project outsiders cannot create a new model.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_outsider.post_project_models(context.pid, "generic", "Test", marking="", description="Description.")

@then(u'unauthenticated users cannot create a new model.')
def step_impl(context):
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@then(u'any authenticated user can create a new project.')
def step_impl(context):
  for user in [context.server_admin, context.project_admin, context.project_writer, context.project_reader, context.project_outsider]:
    context.pid = user.post_projects("Test", "Description.")
    require_valid_project(user.get_project(context.pid))
    user.delete_project(context.pid)

@then(u'unauthenticated users cannot create a new project.')
def step_impl(context):
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@when(u'a client creates a new remote session.')
def step_impl(context):
  context.sid = context.project_admin.post_remotes(context.remote_host, context.remote_user, context.remote_password)

@then(u'the remote session should be created.')
def step_impl(context):
  require_valid_browse(context.project_admin.post_remote_browse(context.sid, "/"))

@then(u'server administrators can add arrayset artifacts to the model.')
def step_impl(context):
  context.server_admin.put_model_arrayset(context.mid, "arrayset")

@then(u'the model contains an empty arrayset artifact.')
def step_impl(context):
  nose.tools.assert_equal(context.server_admin.get_model_arrayset_metadata(context.mid, "arrayset", arrays="..."), {"arrays":[]})

@then(u'project administrators can add arrayset artifacts to the model.')
def step_impl(context):
  context.project_admin.put_model_arrayset(context.mid, "arrayset")

@then(u'project writers can add arrayset artifacts to the model.')
def step_impl(context):
  context.project_writer.put_model_arrayset(context.mid, "arrayset")

@then(u'project readers cannot add arrayset artifacts to the model.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_reader.put_model_arrayset(context.mid, "arrayset")

@then(u'the model doesn\'t contain an arrayset artifact.')
def step_impl(context):
  model = require_valid_model(context.server_admin.get_model(context.mid))
  nose.tools.assert_not_in("arrayset", model["artifact-types"])
  nose.tools.assert_not_in("arrayset", model["input-artifacts"])
  nose.tools.assert_not_in("artifact:arrayset", model)

@then(u'project outsiders cannot add arrayset artifacts to the model.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_outsider.put_model_arrayset(context.mid, "arrayset")

@then(u'unauthenticated users cannot add arrayset artifacts to the model.')
def step_impl(context):
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@then(u'server administrators can add arrays to arrayset artifacts.')
def step_impl(context):
  context.server_admin.put_model_arrayset_array(context.mid, "arrayset", 0, [{"name":"row", "end":10}], [{"name":"string", "type":"string"}])

@then(u'the arrayset artifact contains a new array.')
def step_impl(context):
  nose.tools.assert_equal(context.server_admin.get_model_arrayset_metadata(context.mid, "arrayset", arrays="..."), {u'arrays': [{u'attributes': [{u'name': u'string', u'type': u'string'}], u'dimensions': [{u'begin': 0, u'end': 10, u'name': u'row', u'type': u'int64'}], u'index': 0, u'shape': [10]}]})

@then(u'project administrators can add arrays to arrayset artifacts.')
def step_impl(context):
  context.project_admin.put_model_arrayset_array(context.mid, "arrayset", 0, [{"name":"row", "end":10}], [{"name":"string", "type":"string"}])

@then(u'project writers can add arrays to arrayset artifacts.')
def step_impl(context):
  context.project_writer.put_model_arrayset_array(context.mid, "arrayset", 0, [{"name":"row", "end":10}], [{"name":"string", "type":"string"}])

@then(u'project readers cannot add arrays to arrayset artifacts.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_reader.put_model_arrayset_array(context.mid, "arrayset", 0, [{"name":"row", "end":10}], [{"name":"string", "type":"string"}])

@then(u'the arrayset artifact doesn\'t contain a new array.')
def step_impl(context):
  nose.tools.assert_equal(context.server_admin.get_model_arrayset_metadata(context.mid, "arrayset", arrays="..."), {u'arrays': []})

@then(u'project outsiders cannot add arrays to arrayset artifacts.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_outsider.put_model_arrayset_array(context.mid, "arrayset", 0, [{"name":"row", "end":10}], [{"name":"string", "type":"string"}])

@then(u'unauthenticated users cannot add arrays to arrayset artifacts.')
def step_impl(context):
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@then(u'server administrators can copy artifacts to the second model.')
def step_impl(context):
  context.server_admin.put_model_inputs(context.mid, context.mid2)

@then(u'the model contains the copied artifacts.')
def step_impl(context):
  model = require_valid_model(context.project_admin.get_model(context.mid2))
  nose.tools.assert_equal(model["artifact-types"], {"parameter":"json", "arrayset":"hdf5", "file":"file"})
  nose.tools.assert_items_equal(model["input-artifacts"], ["arrayset", "parameter", "file"])
  nose.tools.assert_equal(context.project_admin.get_model_parameter(context.mid2, "parameter"), sample_model_parameter_artifact)
  nose.tools.assert_equal(context.project_admin.get_model_arrayset_metadata(context.mid2, "arrayset", arrays="..."), {"arrays":[]})

@then(u'project administrators can copy artifacts to the second model.')
def step_impl(context):
  context.project_admin.put_model_inputs(context.mid, context.mid2)

@then(u'project writers can copy artifacts to the second model.')
def step_impl(context):
  context.project_writer.put_model_inputs(context.mid, context.mid2)

@then(u'project readers cannot copy artifacts to the second model.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_reader.put_model_inputs(context.mid, context.mid2)

@then(u'the model doesn\'t contain the copied artifacts.')
def step_impl(context):
  model = require_valid_model(context.project_admin.get_model(context.mid2))
  nose.tools.assert_equal(model["artifact-types"], {})
  nose.tools.assert_items_equal(model["input-artifacts"], [])

@then(u'project outsiders cannot copy artifacts to the second model.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_outsider.put_model_inputs(context.mid, context.mid2)

@then(u'unauthenticated users cannot copy artifacts to the second model.')
def step_impl(context):
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@then(u'server administrators can modify the model.')
def step_impl(context):
  context.server_admin.put_model(context.mid, {"name":"MyModel", "description":"My description.", "state":"finished", "result":"succeeded", "progress":1.0, "message":"Done!", "started":datetime.datetime.utcnow().isoformat(), "finished":datetime.datetime.utcnow().isoformat()})

@then(u'the model is changed.')
def step_impl(context):
  model = require_valid_model(context.server_admin.get_model(context.mid))
  nose.tools.assert_equal(model["name"], "MyModel")
  nose.tools.assert_equal(model["description"], "My description.")
  nose.tools.assert_equal(model["state"], "finished")
  nose.tools.assert_equal(model["result"], "succeeded")
  nose.tools.assert_equal(model["progress"], 1.0)
  nose.tools.assert_equal(model["message"], "Done!")
  require_valid_timestamp(model["started"])
  require_valid_timestamp(model["finished"])

@then(u'project administrators can modify the model.')
def step_impl(context):
  context.project_admin.put_model(context.mid, {"name":"MyModel", "description":"My description.", "state":"finished", "result":"succeeded", "progress":1.0, "message":"Done!", "started":datetime.datetime.utcnow().isoformat(), "finished":datetime.datetime.utcnow().isoformat()})

@then(u'project writers can modify the model.')
def step_impl(context):
  context.project_writer.put_model(context.mid, {"name":"MyModel", "description":"My description.", "state":"finished", "result":"succeeded", "progress":1.0, "message":"Done!", "started":datetime.datetime.utcnow().isoformat(), "finished":datetime.datetime.utcnow().isoformat()})

@then(u'project readers cannot modify the model.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_reader.put_model(context.mid, {"name":"MyModel", "description":"My description.", "state":"finished", "result":"succeeded", "progress":1.0, "message":"Done!", "started":datetime.datetime.utcnow().isoformat(), "finished":datetime.datetime.utcnow().isoformat()})

@then(u'the model is unchanged.')
def step_impl(context):
  model = require_valid_model(context.server_admin.get_model(context.mid))
  nose.tools.assert_equal(model["name"], "Test")
  nose.tools.assert_equal(model["description"], "Description.")
  nose.tools.assert_equal(model["state"], "waiting")
  nose.tools.assert_equal(model["result"], None)
  nose.tools.assert_equal(model["progress"], None)
  nose.tools.assert_equal(model["message"], None)
  nose.tools.assert_equal(model["started"], None)
  nose.tools.assert_equal(model["finished"], None)

@then(u'project outsiders cannot modify the model.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_outsider.put_model(context.mid, {"name":"MyModel", "description":"My description.", "state":"finished", "result":"succeeded", "progress":1.0, "message":"Done!", "started":datetime.datetime.utcnow().isoformat(), "finished":datetime.datetime.utcnow().isoformat()})

@then(u'unauthenticated users cannot modify the model.')
def step_impl(context):
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")

@then(u'server administrators can store a model parameter.')
def step_impl(context):
  context.server_admin.put_model_parameter(context.mid, "parameter", sample_model_parameter_artifact)
  nose.tools.assert_equal(context.server_admin.get_model_parameter(context.mid, "parameter"), sample_model_parameter_artifact)

@then(u'project administrators can store a model parameter.')
def step_impl(context):
  context.project_admin.put_model_parameter(context.mid, "parameter", sample_model_parameter_artifact)
  nose.tools.assert_equal(context.project_admin.get_model_parameter(context.mid, "parameter"), sample_model_parameter_artifact)

@then(u'project writers can store a model parameter.')
def step_impl(context):
  context.project_writer.put_model_parameter(context.mid, "parameter", sample_model_parameter_artifact)
  nose.tools.assert_equal(context.project_writer.get_model_parameter(context.mid, "parameter"), sample_model_parameter_artifact)

@then(u'project readers cannot store a model parameter.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_reader.put_model_parameter(context.mid, "parameter", sample_model_parameter_artifact)
  nose.tools.assert_not_in("parameter", context.server_admin.get_model(context.mid)["artifact-types"])

@then(u'project outsiders cannot store a model parameter.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_outsider.put_model_parameter(context.mid, "parameter", sample_model_parameter_artifact)
  nose.tools.assert_not_in("parameter", context.server_admin.get_model(context.mid)["artifact-types"])

@then(u'unauthenticated users cannot store a model parameter.')
def step_impl(context):
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")
  nose.tools.assert_not_in("parameter", context.server_admin.get_model(context.mid)["artifact-types"])

@then(u'server administrators can modify the project acl, name, and description.')
def step_impl(context):
  context.server_admin.put_project(context.pid, {"name":"MyProject", "description":"My description.", "acl":{"administrators":[{"user":context.project_admin_user}], "writers":[{"user":"foo"}], "readers":[{"user":"bar"}]}})
  project = require_valid_project(context.server_admin.get_project(context.pid))
  nose.tools.assert_equal(project["name"], "MyProject")
  nose.tools.assert_equal(project["description"], "My description.")
  nose.tools.assert_equal(project["acl"]["administrators"], [{"user":context.project_admin_user}])
  nose.tools.assert_equal(project["acl"]["writers"], [{"user":"foo"}])
  nose.tools.assert_equal(project["acl"]["readers"], [{"user":"bar"}])

@then(u'project administrators can modify the project acl, name, and description.')
def step_impl(context):
  context.project_admin.put_project(context.pid, {"name":"MyProject", "description":"My description.", "acl":{"administrators":[{"user":context.project_admin_user}], "writers":[{"user":"foo"}], "readers":[{"user":"bar"}]}})
  project = require_valid_project(context.server_admin.get_project(context.pid))
  nose.tools.assert_equal(project["name"], "MyProject")
  nose.tools.assert_equal(project["description"], "My description.")
  nose.tools.assert_equal(project["acl"]["administrators"], [{"user":context.project_admin_user}])
  nose.tools.assert_equal(project["acl"]["writers"], [{"user":"foo"}])
  nose.tools.assert_equal(project["acl"]["readers"], [{"user":"bar"}])

@then(u'project writers can modify the project name and description only.')
def step_impl(context):
  context.project_writer.put_project(context.pid, {"name":"MyProject", "description":"My description."})
  project = require_valid_project(context.server_admin.get_project(context.pid))
  nose.tools.assert_equal(project["name"], "MyProject")
  nose.tools.assert_equal(project["description"], "My description.")

  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_writer.put_project(context.pid, {"acl":{"administrators":[{"user":context.project_admin_user}], "writers":[{"user":"foo"}], "readers":[{"user":"bar"}]}})

@then(u'project readers cannot modify the project.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_reader.put_project(context.pid, {"Name":"MyProject"})
  nose.tools.assert_equal(context.server_admin.get_project(context.pid)["name"], "Test")

@then(u'project outsiders cannot modify the project.')
def step_impl(context):
  with nose.tools.assert_raises_regexp(slycat.web.client.exceptions.HTTPError, "^403"):
    context.project_outsider.put_project(context.pid, {"Name":"MyProject"})
  nose.tools.assert_equal(context.server_admin.get_project(context.pid)["name"], "Test")

@then(u'unauthenticated users cannot modify the project.')
def step_impl(context):
  nose.tools.eq_(context.unauthenticated_user, None, msg="unauthenticated user got authenticated")
  nose.tools.assert_equal(context.server_admin.get_project(context.pid)["name"], "Test")


