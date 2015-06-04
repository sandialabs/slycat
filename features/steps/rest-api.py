from behave import *

import cherrypy
import datetime
import nose.tools
import PIL.Image
import slycat.web.client
import StringIO
import xml.etree.ElementTree as xml

def require_list(sequence, length=None, item_test=None):
  nose.tools.assert_is_instance(sequence, list)
  if length is not None:
    nose.tools.assert_equal(len(sequence), length)
  if item_test is not None:
    for item in sequence:
      item_test(item)

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

def require_valid_project(project):
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
  return project

def require_valid_reference(reference):
  nose.tools.assert_is_instance(reference, dict)
  for field in [ "bid", "created", "creator", "_id", "mid", "model-type", "name", "project", "_rev", "type", ]:
    nose.tools.assert_in(field, reference)
  nose.tools.assert_equal(reference["type"], "reference")
  require_valid_timestamp(reference["created"])
  return reference

def require_valid_model(model):
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
  return model

sample_bookmark = {"foo":"bar", "baz":5, "blah":[1, 2, 3]}

@given(u'a running Slycat server.')
def step_impl(context):
  context.server_admin = slycat.web.client.Connection(host=context.server_host, proxies={"http":context.server_proxy, "https":context.server_proxy}, auth=(context.server_admin_user, context.server_admin_password))
  context.project_admin = slycat.web.client.Connection(host=context.server_host, proxies={"http":context.server_proxy, "https":context.server_proxy}, auth=(context.project_admin_user, context.project_admin_password))
  context.project_writer = slycat.web.client.Connection(host=context.server_host, proxies={"http":context.server_proxy, "https":context.server_proxy}, auth=(context.project_writer_user, context.project_writer_password))
  context.project_reader = slycat.web.client.Connection(host=context.server_host, proxies={"http":context.server_proxy, "https":context.server_proxy}, auth=(context.project_reader_user, context.project_reader_password))
  context.project_outsider = slycat.web.client.Connection(host=context.server_host, proxies={"http":context.server_proxy, "https":context.server_proxy}, auth=(context.project_outsider_user, context.project_outsider_password))
  context.server_admin.get_configuration_version()

@given(u'a default project.')
def step_impl(context):
  context.pid = context.project_admin.post_projects("Test", "Description.")

@given(u'a second default project.')
def step_impl(context):
  context.pid2 = context.project_admin.post_projects("Test2", "Description2.")

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

@when(u'a client deletes the project.')
def step_impl(context):
  context.project_admin.delete_project(context.pid)

@then(u'the project should no longer exist.')
def step_impl(context):
  with nose.tools.assert_raises(Exception) as raised:
    context.project_admin.get_project(context.pid)
    nose.tools.assert_equal(raised.exception.code, 404)

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

@when(u'a client retrieves the project bookmark.')
def step_impl(context):
  context.bookmark = context.project_admin.get_bookmark(context.bid)

@then(u'the project bookmark should be retrieved.')
def step_impl(context):
  nose.tools.assert_equal(context.bookmark, sample_bookmark)

@when(u'a client requests the set of available markings.')
def step_impl(context):
  context.markings = context.project_admin.get_configuration_markings()

@then(u'the server should return a list of markings.')
def step_impl(context):
  require_list(context.markings, item_test=require_valid_marking)

@when(u'a client requests the set of available parsers.')
def step_impl(context):
  context.parsers = context.project_admin.get_configuration_parsers()

@then(u'the server should return a list of parsers.')
def step_impl(context):
  require_list(context.parsers, item_test=require_valid_parser)

@when(u'a client requests the set of configured remote hosts.')
def step_impl(context):
  context.remote_hosts = context.project_admin.get_configuration_remote_hosts()

@then(u'the server should return a list of remote hosts.')
def step_impl(context):
  require_list(context.remote_hosts, item_test=require_valid_remote_host)

@when(u'a client requests the server support email.')
def step_impl(context):
  context.support_email = context.project_admin.get_configuration_support_email()

@then(u'the server should return its support email.')
def step_impl(context):
  nose.tools.assert_is_instance(context.support_email, dict)
  for field in ["address", "subject"]:
    nose.tools.assert_in(field, context.support_email)

@when(u'a client requests the server version.')
def step_impl(context):
  context.version = context.project_admin.get_configuration_version()

@then(u'the server should return its version.')
def step_impl(context):
  nose.tools.assert_is_instance(context.version, dict)
  for field in ["commit", "version"]:
    nose.tools.assert_in(field, context.version)

@when(u'a client requests available server wizards.')
def step_impl(context):
  context.wizards = context.project_admin.get_configuration_wizards()

@then(u'the server should return a list of available wizards.')
def step_impl(context):
  require_list(context.wizards, item_test=require_valid_wizard)

@when(u'a client requests a global resource.')
def step_impl(context):
  context.resource = context.project_admin.get_global_resource("slycat-logo-navbar.png")

@then(u'the server should return the global resource.')
def step_impl(context):
  image = PIL.Image.open(StringIO.StringIO(context.resource))
  nose.tools.assert_equal(image.size, (662, 146))

@when(u'a client retrieves the model.')
def step_impl(context):
  context.model = require_valid_model(context.project_admin.get_model(context.mid))

@then(u'the server should return the model.')
def step_impl(context):
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

@when(u'a client requests a model resource.')
def step_impl(context):
  context.resource = context.project_admin.get_model_resource("cca", "images/sort-asc-gray.png")

@then(u'the server should return the model resource.')
def step_impl(context):
  image = PIL.Image.open(StringIO.StringIO(context.resource))
  nose.tools.assert_equal(image.size, (9, 5))

@when(u'a client requests a wizard resource.')
def step_impl(context):
  context.resource = context.project_admin.get_wizard_resource("slycat-create-project", "ui.html")

@then(u'the server should return the wizard resource.')
def step_impl(context):
  if not context.resource.startswith("<div"):
    raise Exception("Unexpected resource content.")

@when(u'a client retrieves the project models.')
def step_impl(context):
  context.project_models = context.project_admin.get_project_models(context.pid)

@then(u'the server should return the project models.')
def step_impl(context):
  require_list(context.project_models, length=2, item_test=require_valid_model)

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

@when(u'a client retrieves the project.')
def step_impl(context):
  context.project = require_valid_project(context.project_admin.get_project(context.pid))

@then(u'the server should return the project.')
def step_impl(context):
  nose.tools.assert_equal(context.project["name"], "Test")
  nose.tools.assert_equal(context.project["description"], "Description.")
  nose.tools.assert_equal(context.project["acl"]["administrators"], [{"user":context.project_admin_user}])
  nose.tools.assert_equal(context.project["acl"]["writers"], [])
  nose.tools.assert_equal(context.project["acl"]["readers"], [])

@when(u'a client retrieves all projects.')
def step_impl(context):
  context.projects = context.project_admin.get_projects()

@then(u'the server should return all projects.')
def step_impl(context):
  nose.tools.assert_is_instance(context.projects, dict)
  nose.tools.assert_in("projects", context.projects)
  for project in context.projects["projects"]:
    require_valid_project(project)

@when(u'a client requests information about the current user.')
def step_impl(context):
  context.user = context.project_admin.get_user()

@then(u'the server should return information about the current user.')
def step_impl(context):
  nose.tools.assert_is_instance(context.user, dict)
  for field in ["email", "name", "uid"]:
    nose.tools.assert_in(field, context.user)
  nose.tools.assert_equal(context.user["uid"], context.project_admin_user)

@when(u'a client requests information about another user.')
def step_impl(context):
  context.user = context.project_admin.get_user("foobar")

@then(u'the server should return information about the other user.')
def step_impl(context):
  nose.tools.assert_is_instance(context.user, dict)
  for field in ["email", "name", "uid"]:
    nose.tools.assert_in(field, context.user)
  nose.tools.assert_equal(context.user["uid"], "foobar")

@when(u'a client saves a project bookmark.')
def step_impl(context):
  context.bid = context.project_admin.post_project_bookmarks(context.pid, sample_bookmark)

@then(u'the project bookmark should be saved.')
def step_impl(context):
  context.bookmark = context.project_admin.get_bookmark(context.bid)
  nose.tools.assert_equal(context.bookmark, sample_bookmark)

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

