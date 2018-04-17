# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import json
import nose
import numpy
import numpy.testing
import requests
import slycat.web.client
import shutil
import subprocess
import sys
import time

server_process = None
connection = None
server_admin = None
project_admin = None
project_writer = None
project_reader = None
project_outsider = None
server_outsider = None

sample_acl = {"administrators":[{"user":"foo"}], "writers":[{"user":"bar"}], "readers":[{"user":"baz"}]}
sample_bookmark = {"selected-column":16, "selected-row":34, "color-scheme":"lighthearted"}
sample_table = """name,age\nTim,43\nJake,1\n"""

def require_valid_project(project):
  nose.tools.assert_is_instance(project, dict)
  nose.tools.assert_in("type", project)
  nose.tools.assert_equal(project["type"], "project")
  nose.tools.assert_in("name", project)
  nose.tools.assert_is_instance(project["name"], basestring)
  nose.tools.assert_in("description", project)
  nose.tools.assert_is_instance(project["description"], basestring)
  nose.tools.assert_in("creator", project)
  nose.tools.assert_is_instance(project["creator"], basestring)
  nose.tools.assert_in("created", project)
  nose.tools.assert_is_instance(project["created"], basestring)
  nose.tools.assert_in("acl", project)
  nose.tools.assert_is_instance(project["acl"], dict)
  nose.tools.assert_in("administrators", project["acl"])
  nose.tools.assert_is_instance(project["acl"]["administrators"], list)
  nose.tools.assert_in("readers", project["acl"])
  nose.tools.assert_is_instance(project["acl"]["readers"], list)
  nose.tools.assert_in("writers", project["acl"])
  nose.tools.assert_is_instance(project["acl"]["writers"], list)
  return project

def require_valid_model(model):
  nose.tools.assert_is_instance(model, dict)
  nose.tools.assert_in("type", model)
  nose.tools.assert_equal(model["type"], "model")
  nose.tools.assert_in("name", model)
  nose.tools.assert_is_instance(model["name"], basestring)
  nose.tools.assert_in("description", model)
  nose.tools.assert_is_instance(model["description"], basestring)
  nose.tools.assert_in("creator", model)
  nose.tools.assert_is_instance(model["creator"], basestring)
  nose.tools.assert_in("created", model)
  nose.tools.assert_is_instance(model["created"], basestring)
  nose.tools.assert_in("marking", model)
  nose.tools.assert_is_instance(model["marking"], basestring)
  nose.tools.assert_in("model-type", model)
  nose.tools.assert_is_instance(model["model-type"], basestring)
  nose.tools.assert_in("project", model)
  nose.tools.assert_is_instance(model["project"], basestring)
  nose.tools.assert_in("state", model)
  nose.tools.assert_is_instance(model["state"], basestring)
  return model

def setup():
  shutil.rmtree("test-data-store", ignore_errors=True)
  subprocess.check_call(["python", "slycat-couchdb-setup.py", "--database=slycat-test", "--delete"])

  global server_process
  server_process = subprocess.Popen(["python", "slycat-web-server.py", "--config=test-config.ini"])
  time.sleep(9.0)

  global connection, server_admin, project_admin, project_writer, project_reader, project_outsider, server_outsider
  connection = slycat.web.client.Connection(host="https://localhost:8093", proxies={"http":"", "https":""}, verify=False, auth=("slycat", "slycat"))
  server_admin = slycat.web.client.Connection(host="https://localhost:8093", proxies={"http":"", "https":""}, verify=False, auth=("slycat", "slycat"))
  project_admin = slycat.web.client.Connection(host="https://localhost:8093", proxies={"http":"", "https":""}, verify=False, auth=("foo", "foo"))
  project_writer = slycat.web.client.Connection(host="https://localhost:8093", proxies={"http":"", "https":""}, verify=False, auth=("bar", "bar"))
  project_reader = slycat.web.client.Connection(host="https://localhost:8093", proxies={"http":"", "https":""}, verify=False, auth=("baz", "baz"))
  project_outsider = slycat.web.client.Connection(host="https://localhost:8093", proxies={"http":"", "https":""}, verify=False, auth=("blah", "blah"))
  server_outsider = slycat.web.client.Connection(host="https://localhost:8093", proxies={"http":"", "https":""}, verify=False)

def teardown():
  global server_process
  server_process.terminate()
  server_process.wait()

def test_projects():
  projects = connection.get_projects()
  nose.tools.assert_equal(projects["projects"], [])

  pid1 = connection.post_projects("foo")
  pid2 = connection.post_projects("bar")
  projects = connection.get_projects()
  nose.tools.assert_equal(len(projects["projects"]), 2)
  for project in projects["projects"]:
    require_valid_project(project)

  connection.delete_project(pid2)
  connection.delete_project(pid1)
  projects = connection.get_projects()
  nose.tools.assert_equal(projects["projects"], [])

def test_project():
  pid = connection.post_projects("project", "My test project.")

  project = require_valid_project(connection.get_project(pid))
  nose.tools.assert_equal(project["name"], "project")
  nose.tools.assert_equal(project["description"], "My test project.")
  nose.tools.assert_equal(project["creator"], "slycat")
  nose.tools.assert_equal(project["acl"], {'administrators': [{'user': 'slycat'}], 'writers': [], 'readers': []})

  connection.put_project(pid, {"name":"modified-project", "description":"My modified project.", "acl":{"administrators":[{"user":"slycat"}], "writers":[{"user":"foo"}], "readers":[{"user":"bar"}]}})
  project = require_valid_project(connection.get_project(pid))
  nose.tools.assert_equal(project["name"], "modified-project")
  nose.tools.assert_equal(project["description"], "My modified project.")
  nose.tools.assert_equal(project["acl"], {'administrators': [{'user': 'slycat'}], 'writers': [{"user":"foo"}], 'readers': [{"user":"bar"}]})

  connection.delete_project(pid)
  with nose.tools.assert_raises(requests.HTTPError):
    project = connection.get_project(pid)

def test_bookmarks():
  pid = connection.post_projects("bookmark-project")

  bookmark = {"foo":"bar", "baz":[1, 2, 3]}
  bid = connection.post_project_bookmarks(pid, bookmark)
  nose.tools.assert_equal(connection.get_bookmark(bid), bookmark)

  bid2 = connection.post_project_bookmarks(pid, bookmark)
  nose.tools.assert_equal(bid, bid2)

  connection.delete_project(pid)

def test_models():
  pid = connection.post_projects("models-project")

  mid1 = connection.post_project_models(pid, "generic", "model")
  connection.post_model_finish(mid1)
  connection.join_model(mid1)

  mid2 = connection.post_project_models(pid, "generic", "model2")
  connection.post_model_finish(mid2)
  connection.join_model(mid2)

  models = connection.get_project_models(pid)
  nose.tools.assert_is_instance(models, list)
  nose.tools.assert_equal(len(models), 2)
  for model in models:
    require_valid_model(model)

  connection.delete_model(mid2)
  connection.delete_model(mid1)
  models = connection.get_project_models(pid)
  nose.tools.assert_equal(models, [])

  connection.delete_project(pid)

def test_model_state():
  pid = connection.post_projects("model-state-project")
  mid = connection.post_project_models(pid, "generic", "model-state-model")

  model = connection.get_model(mid)
  nose.tools.assert_equal(model["state"], "waiting")

  with nose.tools.assert_raises(requests.HTTPError):
    connection.update_model(mid, state="bull")

  connection.update_model(mid, state="running")
  model = connection.get_model(mid)
  nose.tools.assert_equal(model["state"], "running")

  connection.update_model(mid, state="finished")
  model = connection.get_model(mid)
  nose.tools.assert_equal(model["state"], "finished")

  connection.update_model(mid, state="closed")
  model = connection.get_model(mid)
  nose.tools.assert_equal(model["state"], "closed")

  connection.delete_model(mid)
  connection.delete_project(pid)

def test_model_result():
  pid = connection.post_projects("model-result-project")
  mid = connection.post_project_models(pid, "generic", "model-result-model")

  model = connection.get_model(mid)
  nose.tools.assert_equal(model.get("result"), None)

  with nose.tools.assert_raises(requests.HTTPError):
    connection.update_model(mid, result="bull")

  connection.update_model(mid, result="succeeded")
  model = connection.get_model(mid)
  nose.tools.assert_equal(model["result"], "succeeded")

  connection.update_model(mid, result="failed")
  model = connection.get_model(mid)
  nose.tools.assert_equal(model["result"], "failed")

  connection.delete_model(mid)
  connection.delete_project(pid)

def test_model_progress():
  pid = connection.post_projects("model-progress-project")
  mid = connection.post_project_models(pid, "generic", "model-progress-model")

  model = connection.get_model(mid)
  nose.tools.assert_equal(model.get("progress", None), None)

  connection.update_model(mid, progress=0.0)
  model = connection.get_model(mid)
  nose.tools.assert_equal(model["progress"], 0.0)

  connection.update_model(mid, progress=1.0)
  model = connection.get_model(mid)
  nose.tools.assert_equal(model["progress"], 1.0)

  connection.delete_model(mid)
  connection.delete_project(pid)

def test_model_message():
  pid = connection.post_projects("model-message-project")
  mid = connection.post_project_models(pid, "generic", "model-message-model")

  model = connection.get_model(mid)
  nose.tools.assert_equal(model.get("message", None), None)

  connection.update_model(mid, message="test 1")
  model = connection.get_model(mid)
  nose.tools.assert_equal(model["message"], "test 1")

  connection.update_model(mid, message="test 2")
  model = connection.get_model(mid)
  nose.tools.assert_equal(model["message"], "test 2")

  connection.delete_model(mid)
  connection.delete_project(pid)

def test_model_parameters():
  pid = connection.post_projects("model-parameters-project")
  mid = connection.post_project_models(pid, "generic", "parameters-model")
  connection.put_model_parameter(mid, "foo", "bar")
  connection.put_model_parameter(mid, "baz", [1, 2, 3])
  connection.put_model_parameter(mid, "blah", {"cat":"dog"})
  connection.put_model_parameter(mid, "output", True, input=False)
  connection.post_model_finish(mid)
  connection.join_model(mid)

  model = connection.get_model(mid)
  nose.tools.assert_in("artifact:foo", model)
  nose.tools.assert_equal(model["artifact:foo"], "bar")
  nose.tools.assert_in("artifact:baz", model)
  nose.tools.assert_equal(model["artifact:baz"], [1, 2, 3])
  nose.tools.assert_in("artifact:blah", model)
  nose.tools.assert_equal(model["artifact:blah"], {"cat":"dog"})
  nose.tools.assert_in("artifact:output", model)
  nose.tools.assert_equal(model["artifact:output"], True)
  nose.tools.assert_in("input-artifacts", model)
  nose.tools.assert_equal(set(model["input-artifacts"]), set(["foo", "baz", "blah"]))
  nose.tools.assert_in("artifact-types", model)
  nose.tools.assert_equal(model["artifact-types"], {"foo":"json", "baz":"json", "blah":"json", "output":"json"})
  connection.delete_model(mid)
  connection.delete_project(pid)

def test_model_file():
  pid = connection.post_projects("model-file-project")
  mid = connection.post_project_models(pid, "generic", "model-file-model")

  connection.put_model_file(mid, "foo", "Howdy, World!", "text/plain")
  nose.tools.assert_equal(connection.get_model_file(mid, "foo"), "Howdy, World!")

  connection.delete_model(mid)
  connection.delete_project(pid)

def test_empty_model_arrays():
  size = 10

  pid = connection.post_projects("empty-arrays-project")
  mid = connection.post_project_models(pid, "generic", "empty-arrays-model")

  connection.put_model_arrayset(mid, "test-array-set")
  connection.put_model_arrayset_array(mid, "test-array-set", 0, [dict(name="row", end=size)], [dict(name="integer", type="int64"), dict(name="float", type="float64"), dict(name="string", type="string")])

  connection.post_model_finish(mid)
  connection.join_model(mid)

  nose.tools.assert_equal(connection.get_model_array_attribute_statistics(mid, "test-array-set", 0, 0), {"min":0, "max":0})
  nose.tools.assert_equal(connection.get_model_array_attribute_statistics(mid, "test-array-set", 0, 1), {"min":0, "max":0})
  nose.tools.assert_equal(connection.get_model_array_attribute_statistics(mid, "test-array-set", 0, 2), {"min":"", "max":""})

  numpy.testing.assert_array_equal(connection.get_model_array_attribute_chunk(mid, "test-array-set", 0, 0, size), numpy.zeros(size, dtype="int64"))
  numpy.testing.assert_array_equal(connection.get_model_array_attribute_chunk(mid, "test-array-set", 0, 1, size), numpy.zeros(size, dtype="float64"))
  numpy.testing.assert_array_equal(connection.get_model_array_attribute_chunk(mid, "test-array-set", 0, 2, size), [""] * size)

  numpy.testing.assert_array_equal(connection.get_model_array_attribute_chunk(mid, "test-array-set", 0, 0, size, "int64"), numpy.zeros(size, dtype="int64"))
  numpy.testing.assert_array_equal(connection.get_model_array_attribute_chunk(mid, "test-array-set", 0, 1, size, "float64"), numpy.zeros(size, dtype="float64"))

  connection.delete_model(mid)
  connection.delete_project(pid)

def test_model_array_slicing():
  pid = connection.post_projects("array-ranges-project")
  mid = connection.post_project_models(pid, "generic", "array-ranges-model")

  connection.put_model_arrayset(mid, "test-array-set")
  connection.put_model_arrayset_array(mid, "test-array-set", 0, [dict(name="row", end=10)], [dict(name="value", type="int64")])
  connection.put_model_arrayset_data(mid, "test-array-set", (0, 0, numpy.index_exp[...], numpy.arange(10)))
  connection.put_model_arrayset_data(mid, "test-array-set", (0, 0, numpy.index_exp[5], numpy.array([5])))
  connection.put_model_arrayset_data(mid, "test-array-set", (0, 0, numpy.index_exp[:5], numpy.arange(5)))
  connection.put_model_arrayset_data(mid, "test-array-set", (0, 0, numpy.index_exp[5:8], numpy.arange(5, 8)))
  connection.put_model_arrayset_data(mid, "test-array-set", (0, 0, numpy.index_exp[8:], numpy.arange(8, 10)))

  connection.post_model_finish(mid)
  connection.join_model(mid)

  numpy.testing.assert_array_equal(connection.get_model_array_attribute_chunk(mid, "test-array-set", 0, 0, 10), numpy.arange(10))
  numpy.testing.assert_array_equal(connection.get_model_array_attribute_chunk(mid, "test-array-set", 0, 0, (2, 5)), numpy.arange(2, 5))
  numpy.testing.assert_array_equal(connection.get_model_array_attribute_chunk(mid, "test-array-set", 0, 0, [(1, 6)]), numpy.arange(1, 6))

  numpy.testing.assert_array_equal(connection.get_model_array_attribute_chunk(mid, "test-array-set", 0, 0, 10, "int64"), numpy.arange(10))
  numpy.testing.assert_array_equal(connection.get_model_array_attribute_chunk(mid, "test-array-set", 0, 0, (2, 5), "int64"), numpy.arange(2, 5))
  numpy.testing.assert_array_equal(connection.get_model_array_attribute_chunk(mid, "test-array-set", 0, 0, [(1, 6)], "int64"), numpy.arange(1, 6))

  connection.delete_model(mid)
  connection.delete_project(pid)

def test_model_array_string_attributes():
  pid = connection.post_projects("array-strings-project")
  mid = connection.post_project_models(pid, "generic", "array-strings-model")

  size = 10
  connection.put_model_arrayset(mid, "test-array-set")
  connection.put_model_arrayset_array(mid, "test-array-set", 0, [dict(name="row", end=size)], [dict(name="v1", type="string"), dict(name="v2", type="string")])
  connection.put_model_arrayset_data(mid, "test-array-set", (0, 0, numpy.index_exp[...], numpy.arange(size).astype("string")))

  connection.post_model_finish(mid)
  connection.join_model(mid)

  numpy.testing.assert_array_equal(connection.get_model_array_attribute_chunk(mid, "test-array-set", 0, 0, size), numpy.arange(size).astype("string"))
  numpy.testing.assert_array_equal(connection.get_model_array_attribute_chunk(mid, "test-array-set", 0, 1, size), numpy.zeros(size, dtype="string"))
  numpy.testing.assert_array_equal(connection.get_model_array_attribute_chunk(mid, "test-array-set", 0, 0, size, "string"), numpy.arange(size).astype("string"))
  numpy.testing.assert_array_equal(connection.get_model_array_attribute_chunk(mid, "test-array-set", 0, 1, size, "string"), numpy.zeros(size, dtype="string"))

  connection.delete_model(mid)
  connection.delete_project(pid)

def test_model_array_1d():
  size = 10
  attribute_types = ["int8", "int16", "int32", "int64", "uint8", "uint16", "uint32", "uint64", "float32", "float64", "string"]
  attribute_names = attribute_types
  attribute_data = [numpy.arange(size).astype(type) for type in attribute_types]

  attributes = [dict(name=name, type=type) for name, type in zip(attribute_names, attribute_types)]
  dimensions = [dict(name="row", end=size)]

  pid = connection.post_projects("1d-array-project")
  mid = connection.post_project_models(pid, "generic", "1d-array-model")
  connection.put_model_arrayset(mid, "test-array-set")
  connection.put_model_arrayset_array(mid, "test-array-set", 0, dimensions, attributes)
  for attribute, data in enumerate(attribute_data):
    connection.put_model_arrayset_data(mid, "test-array-set", (0, attribute, numpy.index_exp[...], data))
  connection.post_model_finish(mid)
  connection.join_model(mid)

  # Test the generic array API ...
  metadata = connection.get_model_array_metadata(mid, "test-array-set", 0)
  nose.tools.assert_equal(attribute_names, [attribute["name"] for attribute in metadata["attributes"]])
  nose.tools.assert_equal(attribute_types, [attribute["type"] for attribute in metadata["attributes"]])
  nose.tools.assert_equal(metadata["dimensions"], [{"name":"row", "type":"int64", "begin":0, "end":size}])

  for attribute, data in enumerate(attribute_data):
    statistics = connection.get_model_array_attribute_statistics(mid, "test-array-set", 0, attribute)
    numpy.testing.assert_equal(statistics["min"], min(data))
    numpy.testing.assert_equal(statistics["max"], max(data))

  for attribute, data in enumerate(attribute_data):
    chunk = connection.get_model_array_attribute_chunk(mid, "test-array-set", 0, attribute, size)
    numpy.testing.assert_array_equal(chunk, data)

  # Test the 1D array (table) API ...
  metadata = connection.get_model_table_metadata(mid, "test-array-set", 0)
  nose.tools.assert_equal(metadata["row-count"], size)
  nose.tools.assert_equal(metadata["column-count"], len(attribute_names))
  nose.tools.assert_equal(metadata["column-names"], attribute_names)
  nose.tools.assert_equal(metadata["column-types"], attribute_types)
  nose.tools.assert_equal(metadata["column-min"], [0, 0, 0, 0, 0, 0, 0, 0, 0.0, 0.0, "0"])
  nose.tools.assert_equal(metadata["column-max"], [9, 9, 9, 9, 9, 9, 9, 9, 9.0, 9.0, "9"])

  for attribute, data in enumerate(attribute_data):
    chunk = connection.get_model_table_chunk(mid, "test-array-set", 0, range(size), [attribute])
    nose.tools.assert_equal(chunk["column-names"][0], attribute_names[attribute])
    numpy.testing.assert_array_equal(chunk["data"][0], data)

  numpy.testing.assert_array_equal(connection.get_model_table_sorted_indices(mid, "test-array-set", 0, numpy.arange(5)), [0, 1, 2, 3, 4])
  numpy.testing.assert_array_equal(connection.get_model_table_sorted_indices(mid, "test-array-set", 0, numpy.arange(5), sort=[(0, "descending")]), [9, 8, 7, 6, 5])

  numpy.testing.assert_array_equal(connection.get_model_table_unsorted_indices(mid, "test-array-set", 0, numpy.arange(5)), [0, 1, 2, 3, 4])
  numpy.testing.assert_array_equal(connection.get_model_table_unsorted_indices(mid, "test-array-set", 0, numpy.arange(5), sort=[(0, "descending")]), [9, 8, 7, 6, 5])

  connection.delete_model(mid)
  connection.delete_project(pid)

def test_copy_model_inputs():
  pid = connection.post_projects("copy-model-inputs-project")
  source = connection.post_project_models(pid, "generic", "source-model")
  target = connection.post_project_models(pid, "generic", "target-model")

  connection.put_model_parameter(source, "name", "Tim")
  connection.put_model_parameter(source, "pi", 3.1415)

  connection.put_model_inputs(source, target)

  model = connection.get_model(target)
  nose.tools.assert_equal(model.get("artifact:name"), "Tim")
  nose.tools.assert_equal(model.get("artifact:pi"), 3.1415)

  connection.delete_model(target)
  connection.delete_model(source)
  connection.delete_project(pid)

def test_api():
  # Any logged-in user can lookup another user.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.get_user("slycat")
  nose.tools.assert_equal(project_outsider.get_user("slycat"), {"uid":"slycat","name":"slycat","email":"slycat@example.com"})
  nose.tools.assert_equal(project_reader.get_user("slycat"), {"uid":"slycat","name":"slycat","email":"slycat@example.com"})
  nose.tools.assert_equal(project_writer.get_user("slycat"), {"uid":"slycat","name":"slycat","email":"slycat@example.com"})
  nose.tools.assert_equal(project_admin.get_user("slycat"), {"uid":"slycat","name":"slycat","email":"slycat@example.com"})
  nose.tools.assert_equal(server_admin.get_user("slycat"), {"uid":"slycat","name":"slycat","email":"slycat@example.com"})

  # Any logged-in user can post an event for logging.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.request("POST", "/events/test")
  project_outsider.request("POST", "/events/test")
  project_reader.request("POST", "/events/test")
  project_writer.request("POST", "/events/test")
  project_admin.request("POST", "/events/test")
  server_admin.request("POST", "/events/test")

  # Any logged-in user can create a remote session.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.request("POST", "/remotes", headers={"content-type":"application/json"}, data=json.dumps({"username":"nobody", "hostname":"nowhere.com", "password":"nothing"}))
  with nose.tools.assert_raises_regexp(Exception, "^500"):
    project_outsider.request("POST", "/remotes", headers={"content-type":"application/json"}, data=json.dumps({"username":"nobody", "hostname":"nowhere.com", "password":"nothing"}))
  with nose.tools.assert_raises_regexp(Exception, "^500"):
    project_reader.request("POST", "/remotes", headers={"content-type":"application/json"}, data=json.dumps({"username":"nobody", "hostname":"nowhere.com", "password":"nothing"}))
  with nose.tools.assert_raises_regexp(Exception, "^500"):
    project_writer.request("POST", "/remotes", headers={"content-type":"application/json"}, data=json.dumps({"username":"nobody", "hostname":"nowhere.com", "password":"nothing"}))
  with nose.tools.assert_raises_regexp(Exception, "^500"):
    project_admin.request("POST", "/remotes", headers={"content-type":"application/json"}, data=json.dumps({"username":"nobody", "hostname":"nowhere.com", "password":"nothing"}))
  with nose.tools.assert_raises_regexp(Exception, "^500"):
    server_admin.request("POST", "/remotes", headers={"content-type":"application/json"}, data=json.dumps({"username":"nobody", "hostname":"nowhere.com", "password":"nothing"}))

  # Any logged-in user can request the home page.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.request("GET", "/")
  project_outsider.request("GET", "/")
  project_reader.request("GET", "/")
  project_writer.request("GET", "/")
  project_admin.request("GET", "/")
  server_admin.request("GET", "/")

  # Any logged-in user can create a project.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.post_projects("test")
  project_outsider.post_projects("test")
  project_reader.post_projects("test")
  project_writer.post_projects("test")
  project_admin.post_projects("test")
  server_admin.post_projects("test")

  # Create a project to use for the remaining tests.
  pid = project_admin.post_projects("security-test")
  project_admin.put_project(pid, {"acl":sample_acl})

  # Any logged-in user can request the list of projects.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.get_projects()
  project_outsider.get_projects()
  project_reader.get_projects()
  project_writer.get_projects()
  project_admin.get_projects()
  server_admin.get_projects()

  # Any project member can request a project.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.get_project(pid)
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.get_project(pid)
  project_reader.get_project(pid)
  project_writer.get_project(pid)
  project_admin.get_project(pid)
  server_admin.get_project(pid)

  # Any project writer can modify name and description.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.put_project(pid, {"name":"my project", "description":"It's mine, all mine!"})
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.put_project(pid, {"name":"my project", "description":"It's mine, all mine!"})
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_reader.put_project(pid, {"name":"my project", "description":"It's mine, all mine!"})
  project_writer.put_project(pid, {"name":"my project", "description":"It's mine, all mine!"})
  project_admin.put_project(pid, {"name":"my project", "description":"It's mine, all mine!"})
  server_admin.put_project(pid, {"name":"my project", "description":"It's mine, all mine!"})

  # Only project admins can modify the ACL.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.put_project(pid, {"acl":sample_acl})
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.put_project(pid, {"acl":sample_acl})
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_reader.put_project(pid, {"acl":sample_acl})
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_writer.put_project(pid, {"acl":sample_acl})
  project_admin.put_project(pid, {"acl":sample_acl})
  server_admin.put_project(pid, {"acl":sample_acl})

  # Any project member (not just writers) can save a bookmark.
  bookmarks = []
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    bid = server_outsider.post_project_bookmarks(pid, sample_bookmark)
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    bid = project_outsider.post_project_bookmarks(pid, sample_bookmark)
  bid = project_reader.post_project_bookmarks(pid, sample_bookmark)
  bid = project_writer.post_project_bookmarks(pid, sample_bookmark)
  bid = project_admin.post_project_bookmarks(pid, sample_bookmark)
  bid = server_admin.post_project_bookmarks(pid, sample_bookmark)

  # Any project member can get a bookmark.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.get_bookmark(bid)
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.get_bookmark(bid)
  project_reader.get_bookmark(bid)
  project_writer.get_bookmark(bid)
  project_admin.get_bookmark(bid)
  server_admin.get_bookmark(bid)

  # Any project writer can create a model.
  models = []
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    models.append(server_outsider.post_project_models(pid, "generic", "test-model"))
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    models.append(project_outsider.post_project_models(pid, "generic", "test-model"))
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    models.append(project_reader.post_project_models(pid, "generic", "test-model"))
  models.append(project_writer.post_project_models(pid, "generic", "test-model"))
  models.append(project_admin.post_project_models(pid, "generic", "test-model"))
  models.append(server_admin.post_project_models(pid, "generic", "test-model"))

  # Any project writer can store a model parameter.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.put_model_parameter(models[0], "pi", 3.1415)
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.put_model_parameter(models[0], "pi", 3.1415)
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_reader.put_model_parameter(models[0], "pi", 3.1415)
  project_writer.put_model_parameter(models[0], "pi", 3.1415)
  project_admin.put_model_parameter(models[0], "pi", 3.1415)
  server_admin.put_model_parameter(models[0], "pi", 3.1415)

  # Any project writer can store a model file.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.put_model_file(models[0], "foo", "Supercalifragilisticexpialidocious", "text/plain", input=False)
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.put_model_file(models[0], "foo", "Supercalifragilisticexpialidocious", "text/plain", input=False)
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_reader.put_model_file(models[0], "foo", "Supercalifragilisticexpialidocious", "text/plain", input=False)
  project_writer.put_model_file(models[0], "foo", "Supercalifragilisticexpialidocious", "text/plain", input=False)
  project_admin.put_model_file(models[0], "foo", "Supercalifragilisticexpialidocious", "text/plain", input=False)
  server_admin.put_model_file(models[0], "foo", "Supercalifragilisticexpialidocious", "text/plain", input=False)

  # Any project writer can start an arrayset artifact.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.put_model_arrayset(models[0], "data")
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.put_model_arrayset(models[0], "data")
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_reader.put_model_arrayset(models[0], "data")
  project_writer.put_model_arrayset(models[0], "data")
  project_admin.put_model_arrayset(models[0], "data")
  server_admin.put_model_arrayset(models[0], "data")

  # Any project writer can start an array.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.put_model_arrayset_array(models[0], "data", 0, [dict(name="i", end=10)], [dict(name="value", type="int64")])
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.put_model_arrayset_array(models[0], "data", 0, [dict(name="i", end=10)], [dict(name="value", type="int64")])
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_reader.put_model_arrayset_array(models[0], "data", 0, [dict(name="i", end=10)], [dict(name="value", type="int64")])
  project_writer.put_model_arrayset_array(models[0], "data", 0, [dict(name="i", end=10)], [dict(name="value", type="int64")])
  project_admin.put_model_arrayset_array(models[0], "data", 0, [dict(name="i", end=10)], [dict(name="value", type="int64")])
  server_admin.put_model_arrayset_array(models[0], "data", 0, [dict(name="i", end=10)], [dict(name="value", type="int64")])

  # Any project writer can store an array attribute.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.put_model_arrayset_data(models[0], "data", (0, 0, numpy.index_exp[...], numpy.arange(10)))
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.put_model_arrayset_data(models[0], "data", (0, 0, numpy.index_exp[...], numpy.arange(10)))
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_reader.put_model_arrayset_data(models[0], "data", (0, 0, numpy.index_exp[...], numpy.arange(10)))
  project_writer.put_model_arrayset_data(models[0], "data", (0, 0, numpy.index_exp[...], numpy.arange(10)))
  project_admin.put_model_arrayset_data(models[0], "data", (0, 0, numpy.index_exp[...], numpy.arange(10)))
  server_admin.put_model_arrayset_data(models[0], "data", (0, 0, numpy.index_exp[...], numpy.arange(10)))

  # Any project writer can upload a table.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.request("PUT", "/models/%s/tables/test" % models[0], files={"file":("table.csv", sample_table)}, data={"input":"true"})
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.request("PUT", "/models/%s/tables/test" % models[0], files={"file":("table.csv", sample_table)}, data={"input":"true"})
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_reader.request("PUT", "/models/%s/tables/test" % models[0], files={"file":("table.csv", sample_table)}, data={"input":"true"})
  project_writer.request("PUT", "/models/%s/tables/test" % models[0], files={"file":("table.csv", sample_table)}, data={"input":"true"})
  project_admin.request("PUT", "/models/%s/tables/test" % models[0], files={"file":("table.csv", sample_table)}, data={"input":"true"})
  server_admin.request("PUT", "/models/%s/tables/test" % models[0], files={"file":("table.csv", sample_table)}, data={"input":"true"})

  # Any project writer can copy inputs from one model to another.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.put_model_inputs(models[0], models[1])
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.put_model_inputs(models[0], models[1])
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_reader.put_model_inputs(models[0], models[1])
  project_writer.put_model_inputs(models[0], models[1])
  project_admin.put_model_inputs(models[0], models[1])
  server_admin.put_model_inputs(models[0], models[1])

  # Any logged-in user can request the list of open models, but will only see models from their projects.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.request("GET", "/models")
  nose.tools.assert_equal(len(project_outsider.request("GET", "/models")["models"]), 0)
  nose.tools.assert_equal(len(project_reader.request("GET", "/models")["models"]), 3)
  nose.tools.assert_equal(len(project_writer.request("GET", "/models")["models"]), 3)
  nose.tools.assert_equal(len(project_admin.request("GET", "/models")["models"]), 3)
  nose.tools.assert_equal(len(server_admin.request("GET", "/models")["models"]), 3)

  # Any project writer can finish a model.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.post_model_finish(models[0])
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.post_model_finish(models[0])
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_reader.post_model_finish(models[0])
  project_writer.post_model_finish(models[0])
  project_admin.post_model_finish(models[1])
  server_admin.post_model_finish(models[2])

  # Any project member can request the list of project models.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.get_project_models(pid)
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.get_project_models(pid)
  project_reader.get_project_models(pid)
  project_writer.get_project_models(pid)
  project_admin.get_project_models(pid)
  server_admin.get_project_models(pid)

  # Any project reader can get a model.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.get_model(models[0])
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.get_model(models[0])
  project_reader.get_model(models[0])
  project_writer.get_model(models[0])
  project_admin.get_model(models[0])
  server_admin.get_model(models[0])

  # Any project reader can retrieve a model file.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.request("GET", "/models/%s/files/foo" % models[0])
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.request("GET", "/models/%s/files/foo" % models[0])
  project_reader.request("GET", "/models/%s/files/foo" % models[0])
  project_writer.request("GET", "/models/%s/files/foo" % models[0])
  project_admin.request("GET", "/models/%s/files/foo" % models[0])
  server_admin.request("GET", "/models/%s/files/foo" % models[0])

  # Any project reader can retrieve model array metadata.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.get_model_array_metadata(models[0], "data", 0)
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.get_model_array_metadata(models[0], "data", 0)
  project_reader.get_model_array_metadata(models[0], "data", 0)
  project_writer.get_model_array_metadata(models[0], "data", 0)
  project_admin.get_model_array_metadata(models[0], "data", 0)
  server_admin.get_model_array_metadata(models[0], "data", 0)

  # Any project reader can retrieve model array attribute statistics.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.get_model_array_attribute_statistics(models[0], "data", 0, 0)
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.get_model_array_attribute_statistics(models[0], "data", 0, 0)
  project_reader.get_model_array_attribute_statistics(models[0], "data", 0, 0)
  project_writer.get_model_array_attribute_statistics(models[0], "data", 0, 0)
  project_admin.get_model_array_attribute_statistics(models[0], "data", 0, 0)
  server_admin.get_model_array_attribute_statistics(models[0], "data", 0, 0)

  # Any project reader can retrieve model array attribute chunks.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.get_model_array_attribute_chunk(models[0], "data", 0, 0, 10)
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.get_model_array_attribute_chunk(models[0], "data", 0, 0, 10)
  project_reader.get_model_array_attribute_chunk(models[0], "data", 0, 0, 10)
  project_writer.get_model_array_attribute_chunk(models[0], "data", 0, 0, 10)
  project_admin.get_model_array_attribute_chunk(models[0], "data", 0, 0, 10)
  server_admin.get_model_array_attribute_chunk(models[0], "data", 0, 0, 10)

  # Any project reader can retrieve model table metadata.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.get_model_table_metadata(models[0], "data", 0)
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.get_model_table_metadata(models[0], "data", 0)
  project_reader.get_model_table_metadata(models[0], "data", 0)
  project_writer.get_model_table_metadata(models[0], "data", 0)
  project_admin.get_model_table_metadata(models[0], "data", 0)
  server_admin.get_model_table_metadata(models[0], "data", 0)

  # Any project reader can retrieve model table chunks.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.get_model_table_chunk(models[0], "data", 0, range(10), range(1))
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.get_model_table_chunk(models[0], "data", 0, range(10), range(1))
  project_reader.get_model_table_chunk(models[0], "data", 0, range(10), range(1))
  project_writer.get_model_table_chunk(models[0], "data", 0, range(10), range(1))
  project_admin.get_model_table_chunk(models[0], "data", 0, range(10), range(1))
  server_admin.get_model_table_chunk(models[0], "data", 0, range(10), range(1))

  # Any project reader can retrieve model table sorted indices.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.get_model_table_sorted_indices(models[0], "data", 0, range(5))
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.get_model_table_sorted_indices(models[0], "data", 0, range(5))
  project_reader.get_model_table_sorted_indices(models[0], "data", 0, range(5))
  project_writer.get_model_table_sorted_indices(models[0], "data", 0, range(5))
  project_admin.get_model_table_sorted_indices(models[0], "data", 0, range(5))
  server_admin.get_model_table_sorted_indices(models[0], "data", 0, range(5))

  # Any project reader can retrieve model table unsorted indices.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.get_model_table_unsorted_indices(models[0], "data", 0, range(5))
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.get_model_table_unsorted_indices(models[0], "data", 0, range(5))
  project_reader.get_model_table_unsorted_indices(models[0], "data", 0, range(5))
  project_writer.get_model_table_unsorted_indices(models[0], "data", 0, range(5))
  project_admin.get_model_table_unsorted_indices(models[0], "data", 0, range(5))
  server_admin.get_model_table_unsorted_indices(models[0], "data", 0, range(5))

  # Any project writer can modify a model.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.put_model(models[0], {"name":"my-model", "description":"It's mine!  All mine!"})
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.put_model(models[0], {"name":"my-model", "description":"It's mine!  All mine!"})
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_reader.put_model(models[0], {"name":"my-model", "description":"It's mine!  All mine!"})
  project_writer.put_model(models[0], {"name":"my-model", "description":"It's mine!  All mine!"})
  project_admin.put_model(models[0], {"name":"my-model", "description":"It's mine!  All mine!"})
  server_admin.put_model(models[0], {"name":"my-model", "description":"It's mine!  All mine!"})

  # Any project writer can delete a model.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.delete_model(models[0])
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.delete_model(models[0])
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_reader.delete_model(models[0])
  project_writer.delete_model(models.pop())
  project_admin.delete_model(models.pop())
  server_admin.delete_model(models.pop())

  # Only project admins can delete a project.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.delete_project(pid)
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.delete_project(pid)
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_reader.delete_project(pid)
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_writer.delete_project(pid)
  project_admin.delete_project(pid)

def test_server_administrator():
  pid = project_admin.post_projects("security-test")
  project_admin.put_project(pid, {"acl":sample_acl})

  # Server admins can delete any project.
  server_admin.delete_project(pid)

def test_array_modifications():
  attributes = [dict(name="a", type="float64")]
  dimensions = [dict(name="row", end=10)]

  pid = connection.post_projects("array-modifications-project")
  mid = connection.post_project_models(pid, "generic", "array-modifications-model")
  connection.put_model_arrayset(mid, "test-array-set")
  connection.put_model_arrayset_array(mid, "test-array-set", 0, dimensions, attributes)
  connection.put_model_arrayset_data(mid, "test-array-set", (0, 0, numpy.index_exp[...], numpy.arange(10).astype("float64")))
  connection.post_model_finish(mid)
  connection.join_model(mid)

  statistics = connection.get_model_array_attribute_statistics(mid, "test-array-set", 0, 0)
  nose.tools.assert_equal(statistics["min"], 0)
  nose.tools.assert_equal(statistics["max"], 9)
  numpy.testing.assert_array_equal(connection.get_model_table_chunk(mid, "test-array-set", 0, rows=numpy.arange(10), columns=[0])["data"][0], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  numpy.testing.assert_array_equal(connection.get_model_table_sorted_indices(mid, "test-array-set", 0, numpy.arange(10), sort=[(0, "ascending")]), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])

  connection.put_model_arrayset_data(mid, "test-array-set", (0, 0, numpy.index_exp[3:5], numpy.array([15, 12], dtype="float64")))

  statistics = connection.get_model_array_attribute_statistics(mid, "test-array-set", 0, 0)
  nose.tools.assert_equal(statistics["min"], 0)
  nose.tools.assert_equal(statistics["max"], 15)
  numpy.testing.assert_array_equal(connection.get_model_table_chunk(mid, "test-array-set", 0, rows=numpy.arange(10), columns=[0])["data"][0], [0, 1, 2, 15, 12, 5, 6, 7, 8, 9])
  numpy.testing.assert_array_equal(connection.get_model_table_sorted_indices(mid, "test-array-set", 0, numpy.arange(10), sort=[(0, "ascending")]), [0, 1, 2, 9, 8, 3, 4, 5, 6, 7])

  connection.delete_model(mid)
  connection.delete_project(pid)

def test_binary_hyperchunks():
  attributes = [dict(name="a", type="float64"), dict(name="b", type="float64"), dict(name="c", type="float64")]
  dimensions = [dict(name="row", end=10)]

  pid = connection.post_projects("array-modifications-project")
  mid = connection.post_project_models(pid, "generic", "array-modifications-model")
  connection.put_model_arrayset(mid, "test-array-set")
  connection.put_model_arrayset_array(mid, "test-array-set", 0, dimensions, attributes)
  connection.put_model_arrayset_data(mid, "test-array-set", (0, 0, numpy.index_exp[...], numpy.zeros(10).astype("float64")))
  connection.put_model_arrayset_data(mid, "test-array-set", (0, 1, numpy.index_exp[...], numpy.zeros(10).astype("float64")))
  connection.put_model_arrayset_data(mid, "test-array-set", (0, 2, numpy.index_exp[...], numpy.zeros(10).astype("float64")))
  connection.post_model_finish(mid)
  connection.join_model(mid)

  connection.put_model_arrayset_data(mid, "test-array-set", (0, 2, [numpy.index_exp[8], numpy.index_exp[9], numpy.index_exp[7]], [numpy.array([111], dtype="float64"), numpy.array([112], dtype="float64"), numpy.array([113], dtype="float64")]))

  statistics = connection.get_model_array_attribute_statistics(mid, "test-array-set", 0, 2)
  nose.tools.assert_equal(statistics["min"], 0)
  nose.tools.assert_equal(statistics["max"], 113)
  numpy.testing.assert_array_equal(connection.get_model_table_chunk(mid, "test-array-set", 0, rows=numpy.arange(10), columns=[2])["data"][0], [0, 0, 0, 0, 0, 0, 0, 113, 111, 112])

  connection.delete_model(mid)
  connection.delete_project(pid)

def test_json_hyperchunks():
  attributes = [dict(name="a", type="float64"), dict(name="b", type="float64"), dict(name="c", type="float64")]
  dimensions = [dict(name="row", end=10)]

  pid = connection.post_projects("array-modifications-project")
  mid = connection.post_project_models(pid, "generic", "array-modifications-model")
  connection.put_model_arrayset(mid, "test-array-set")
  connection.put_model_arrayset_array(mid, "test-array-set", 0, dimensions, attributes)
  connection.put_model_arrayset_data(mid, "test-array-set", (0, 0, numpy.index_exp[...], numpy.zeros(10).astype("float64")))
  connection.put_model_arrayset_data(mid, "test-array-set", (0, 1, numpy.index_exp[...], numpy.zeros(10).astype("float64")))
  connection.put_model_arrayset_data(mid, "test-array-set", (0, 2, numpy.index_exp[...], numpy.zeros(10).astype("float64")))
  connection.post_model_finish(mid)
  connection.join_model(mid)

  connection.put_model_arrayset_data(mid, "test-array-set", (0, 2, [numpy.index_exp[8], numpy.index_exp[9], numpy.index_exp[7]], [numpy.array([111], dtype="float64"), numpy.array([112], dtype="float64"), numpy.array([113], dtype="float64")]), force_json=True)

  statistics = connection.get_model_array_attribute_statistics(mid, "test-array-set", 0, 2)
  nose.tools.assert_equal(statistics["min"], 0)
  nose.tools.assert_equal(statistics["max"], 113)
  numpy.testing.assert_array_equal(connection.get_model_table_chunk(mid, "test-array-set", 0, rows=numpy.arange(10), columns=[2])["data"][0], [0, 0, 0, 0, 0, 0, 0, 113, 111, 112])

  connection.delete_model(mid)
  connection.delete_project(pid)

def test_remote_browse_filter():
  import pprint
  sid = connection.post_remotes("localhost", "slycat", "slycat")
  directory = connection.post_remote_browse(sid, "/home/slycat/src/slycat/web-server")
  for name in ["plugins", "templates", "config.ini", "slycat-web-server.py", "web-server.pem"]:
    nose.tools.assert_in(name, directory["names"])

  directory = connection.post_remote_browse(sid, "/home/slycat/src/slycat/web-server", file_reject="[.]py$")
  for name in ["plugins", "templates", "config.ini", "web-server.pem"]:
    nose.tools.assert_in(name, directory["names"])
  for name in ["slycat-web-server.py"]:
    nose.tools.assert_not_in(name, directory["names"])

  directory = connection.post_remote_browse(sid, "/home/slycat/src/slycat/web-server", file_reject=".*", file_allow="[.]py$")
  for name in ["plugins", "templates", "slycat-web-server.py"]:
    nose.tools.assert_in(name, directory["names"])
  for name in ["config.ini", "web-server.pem"]:
    nose.tools.assert_not_in(name, directory["names"])

  directory = connection.post_remote_browse(sid, "/home/slycat/src/slycat/web-server", directory_reject=".*")
  for name in ["config.ini", "slycat-web-server.py", "web-server.pem"]:
    nose.tools.assert_in(name, directory["names"])
  for name in ["plugins", "templates"]:
    nose.tools.assert_not_in(name, directory["names"])

  directory = connection.post_remote_browse(sid, "/home/slycat/src/slycat/web-server", directory_reject=".*", directory_allow="plugins")
  for name in ["plugins", "config.ini", "slycat-web-server.py", "web-server.pem"]:
    nose.tools.assert_in(name, directory["names"])
  for name in ["templates"]:
    nose.tools.assert_not_in(name, directory["names"])


