# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

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

  global server_process, connection
  server_process = subprocess.Popen(["python", "slycat-web-server.py", "--config=test-config.ini"])
  time.sleep(2.0)
  connection = slycat.web.client.connection(host="https://localhost:8093", proxies={"http":"", "https":""}, verify=False, auth=("slycat", "slycat"), log=slycat.web.client.dev_null())

def teardown():
  global server_process
  server_process.terminate()
  server_process.wait()

def test_projects():
  projects = connection.get_projects()
  nose.tools.assert_equal(projects, [])

  pid1 = connection.create_project("foo")
  pid2 = connection.create_project("bar")
  projects = connection.get_projects()
  nose.tools.assert_is_instance(projects, list)
  nose.tools.assert_equal(len(projects), 2)
  for project in projects:
    require_valid_project(project)

  connection.delete_project(pid2)
  connection.delete_project(pid1)
  projects = connection.get_projects()
  nose.tools.assert_equal(projects, [])

def test_project():
  pid = connection.create_project("test-project", "My test project.")

  project = require_valid_project(connection.get_project(pid))
  nose.tools.assert_equal(project["name"], "test-project")
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
  pid = connection.create_project("test-project")

  bookmark = {"foo":"bar", "baz":[1, 2, 3]}
  bid = connection.create_bookmark(pid, bookmark)
  nose.tools.assert_equal(connection.get_bookmark(bid), bookmark)

  bid2 = connection.create_bookmark(pid, bookmark)
  nose.tools.assert_equal(bid, bid2)

  connection.delete_project(pid)

def test_models():
  pid = connection.create_project("test-project")

  mid1 = connection.create_model(pid, "generic", "test-model")
  connection.finish_model(mid1)
  connection.join_model(mid1)

  mid2 = connection.create_model(pid, "generic", "test-model-2")
  connection.finish_model(mid2)
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

def test_model_parameters():
  pid = connection.create_project("test-project")
  mid = connection.create_model(pid, "generic", "test-model")
  connection.store_parameter(mid, "foo", "bar")
  connection.store_parameter(mid, "baz", [1, 2, 3])
  connection.store_parameter(mid, "blah", {"cat":"dog"})
  connection.store_parameter(mid, "output", True, input=False)
  connection.finish_model(mid)
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

def test_empty_model_arrays():
  size = 10

  pid = connection.create_project("test-project")
  mid = connection.create_model(pid, "generic", "test-model")

  connection.start_array_set(mid, "test-array-set")
  connection.start_array(mid, "test-array-set", 0, [("integer", "int64"), ("float", "float64"), ("string", "string")], ("row", "int64", 0, size))

  connection.finish_model(mid)
  connection.join_model(mid)

  metadata = connection.get_array_metadata(mid, "test-array-set", 0)
  nose.tools.assert_equal(metadata["statistics"], [{"min":None,"max":None},{"min":None,"max":None},{"min":None,"max":None}])

  numpy.testing.assert_array_equal(connection.get_array_chunk(mid, "test-array-set", 0, 0, size), numpy.zeros(size, dtype="int64"))
  numpy.testing.assert_array_equal(connection.get_array_chunk(mid, "test-array-set", 0, 1, size), numpy.zeros(size, dtype="float64"))
  numpy.testing.assert_array_equal(connection.get_array_chunk(mid, "test-array-set", 0, 2, size), [""] * size)

  numpy.testing.assert_array_equal(connection.get_array_chunk(mid, "test-array-set", 0, 0, size, "int64"), numpy.zeros(size, dtype="int64"))
  numpy.testing.assert_array_equal(connection.get_array_chunk(mid, "test-array-set", 0, 1, size, "float64"), numpy.zeros(size, dtype="float64"))

  connection.delete_model(mid)
  connection.delete_project(pid)

def test_model_array_ranges():
  pid = connection.create_project("test-project")
  mid = connection.create_model(pid, "generic", "test-model")

  connection.start_array_set(mid, "test-array-set")
  connection.start_array(mid, "test-array-set", 0, ("value", "int64"), ("row", "int64", 0, 10))
  connection.store_array_attribute(mid, "test-array-set", 0, 0, numpy.arange(5))
  connection.store_array_attribute(mid, "test-array-set", 0, 0, numpy.arange(5, 8), (5, 8))
  connection.store_array_attribute(mid, "test-array-set", 0, 0, numpy.arange(8, 10), [(8, 10)])

  connection.finish_model(mid)
  connection.join_model(mid)

  numpy.testing.assert_array_equal(connection.get_array_chunk(mid, "test-array-set", 0, 0, 10), numpy.arange(10))
  numpy.testing.assert_array_equal(connection.get_array_chunk(mid, "test-array-set", 0, 0, (2, 5)), numpy.arange(2, 5))
  numpy.testing.assert_array_equal(connection.get_array_chunk(mid, "test-array-set", 0, 0, [(1, 6)]), numpy.arange(1, 6))

  numpy.testing.assert_array_equal(connection.get_array_chunk(mid, "test-array-set", 0, 0, 10, "int64"), numpy.arange(10))
  numpy.testing.assert_array_equal(connection.get_array_chunk(mid, "test-array-set", 0, 0, (2, 5), "int64"), numpy.arange(2, 5))
  numpy.testing.assert_array_equal(connection.get_array_chunk(mid, "test-array-set", 0, 0, [(1, 6)], "int64"), numpy.arange(1, 6))

  connection.delete_model(mid)
  connection.delete_project(pid)

def test_model_array_string_attributes():
  """Test sending string attributes to the server as numpy arrays and as lists of strings."""
  pid = connection.create_project("test-project")
  mid = connection.create_model(pid, "generic", "test-model")

  size = 10
  connection.start_array_set(mid, "test-array-set")
  connection.start_array(mid, "test-array-set", 0, [("v1", "string"), ("v2", "string")], ("row", "int64", 0, size))
  connection.store_array_attribute(mid, "test-array-set", 0, 0, numpy.arange(size).astype("string"))
  connection.store_array_attribute(mid, "test-array-set", 0, 1, numpy.arange(size).astype("string").tolist())

  connection.finish_model(mid)
  connection.join_model(mid)

  numpy.testing.assert_array_equal(connection.get_array_chunk(mid, "test-array-set", 0, 0, size), numpy.arange(size).astype("string"))
  numpy.testing.assert_array_equal(connection.get_array_chunk(mid, "test-array-set", 0, 1, size), numpy.arange(size).astype("string"))
  numpy.testing.assert_array_equal(connection.get_array_chunk(mid, "test-array-set", 0, 0, size, "string"), numpy.arange(size).astype("string"))
  numpy.testing.assert_array_equal(connection.get_array_chunk(mid, "test-array-set", 0, 1, size, "string"), numpy.arange(size).astype("string"))

  connection.delete_model(mid)
  connection.delete_project(pid)

def test_model_array_1d():
  size = 10
  attribute_types = ["int8", "int16", "int32", "int64", "uint8", "uint16", "uint32", "uint64", "float32", "float64", "string"]
  attribute_names = attribute_types
  attribute_data = [numpy.arange(size).astype(type) for type in attribute_types]

  attributes = zip(attribute_names, attribute_types)
  dimensions = [("row", "int64", 0, size)]

  pid = connection.create_project("test-project")
  mid = connection.create_model(pid, "generic", "test-model")
  connection.start_array_set(mid, "test-array-set")
  connection.start_array(mid, "test-array-set", 0, attributes, dimensions)
  for attribute, data in enumerate(attribute_data):
    connection.store_array_attribute(mid, "test-array-set", 0, attribute, data)
  connection.finish_model(mid)
  connection.join_model(mid)

  # Test the generic array API ...
  metadata = connection.get_array_metadata(mid, "test-array-set", 0)
  nose.tools.assert_equal(attribute_names, [attribute["name"] for attribute in metadata["attributes"]])
  nose.tools.assert_equal(attribute_types, [attribute["type"] for attribute in metadata["attributes"]])
  nose.tools.assert_equal(metadata["dimensions"], [{"name":"row", "type":"int64", "begin":0, "end":size}])
  for statistic, data in zip(metadata["statistics"], attribute_data):
    numpy.testing.assert_equal(statistic["min"], min(data))
    numpy.testing.assert_equal(statistic["max"], max(data))

  for attribute, data in enumerate(attribute_data):
    chunk = connection.get_array_chunk(mid, "test-array-set", 0, attribute, size)
    numpy.testing.assert_array_equal(chunk, data)

  # Test the 1D array (table) API ...
  metadata = connection.get_table_metadata(mid, "test-array-set", 0)
  nose.tools.assert_equal(metadata["row-count"], size)
  nose.tools.assert_equal(metadata["column-count"], len(attribute_names))
  nose.tools.assert_equal(metadata["column-names"], attribute_names)
  nose.tools.assert_equal(metadata["column-types"], attribute_types)
  nose.tools.assert_equal(metadata["column-min"], [0, 0, 0, 0, 0, 0, 0, 0, 0.0, 0.0, "0"])
  nose.tools.assert_equal(metadata["column-max"], [9, 9, 9, 9, 9, 9, 9, 9, 9.0, 9.0, "9"])

  for attribute, data in enumerate(attribute_data):
    chunk = connection.get_table_chunk(mid, "test-array-set", 0, range(size), [attribute])
    nose.tools.assert_equal(chunk["column-names"][0], attribute_names[attribute])
    numpy.testing.assert_array_equal(chunk["data"][0], data)

  connection.delete_model(mid)
  connection.delete_project(pid)

