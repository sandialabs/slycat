# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import json
import nose
import numpy
import slycat.web.client
import shutil
import subprocess
import sys
import time

server_process = None
server_admin = None
project_admin = None
project_writer = None
project_reader = None
project_outsider = None
server_outsider = None

sample_acl = {"administrators":[{"user":"foo"}], "writers":[{"user":"bar"}], "readers":[{"user":"baz"}]}
sample_bookmark = {"selected-column":16, "selected-row":34, "color-scheme":"lighthearted"}
sample_table = """name,age\nTim,43\nJake,1\n"""

def setup():
  shutil.rmtree("test-data-store", ignore_errors=True)
  subprocess.check_call(["python", "slycat-couchdb-setup.py", "--database=slycat-test", "--delete"])

  global server_process
  server_process = subprocess.Popen(["python", "slycat-web-server.py", "--config=test-config.ini"])
  time.sleep(2.0)

  global server_admin, project_admin, project_writer, project_reader, project_outsider, server_outsider
  server_admin = slycat.web.client.connection(host="https://localhost:8093", proxies={"http":"", "https":""}, verify=False, auth=("slycat", "slycat"), log=slycat.web.client.dev_null())
  project_admin = slycat.web.client.connection(host="https://localhost:8093", proxies={"http":"", "https":""}, verify=False, auth=("foo", "foo"), log=slycat.web.client.dev_null())
  project_writer = slycat.web.client.connection(host="https://localhost:8093", proxies={"http":"", "https":""}, verify=False, auth=("bar", "bar"), log=slycat.web.client.dev_null())
  project_reader = slycat.web.client.connection(host="https://localhost:8093", proxies={"http":"", "https":""}, verify=False, auth=("baz", "baz"), log=slycat.web.client.dev_null())
  project_outsider = slycat.web.client.connection(host="https://localhost:8093", proxies={"http":"", "https":""}, verify=False, auth=("blah", "blah"), log=slycat.web.client.dev_null())
  server_outsider = slycat.web.client.connection(host="https://localhost:8093", proxies={"http":"", "https":""}, verify=False, log=slycat.web.client.dev_null())

def teardown():
  global server_process
  server_process.terminate()
  server_process.wait()

def test_users():
  nose.tools.assert_equal(server_admin.get_user("slycat")["server-administrator"], True)
  nose.tools.assert_equal(server_admin.get_user("foo")["server-administrator"], False)
  nose.tools.assert_equal(server_admin.get_user("bar")["server-administrator"], False)
  nose.tools.assert_equal(server_admin.get_user("baz")["server-administrator"], False)
  nose.tools.assert_equal(server_admin.get_user("blah")["server-administrator"], False)
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.get_user("foo")

def test_api():
  # Any logged-in user can lookup another user, but only server administrators get all the details.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.get_user("slycat")
  nose.tools.assert_equal(project_outsider.get_user("slycat").get("server-administrator"), None)
  nose.tools.assert_equal(project_reader.get_user("slycat").get("server-administrator"), None)
  nose.tools.assert_equal(project_writer.get_user("slycat").get("server-administrator"), None)
  nose.tools.assert_equal(project_admin.get_user("slycat").get("server-administrator"), None)
  nose.tools.assert_equal(server_admin.get_user("slycat").get("server-administrator"), True)

  # Any logged-in user can post an event for logging.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.request("POST", "/events/test")
  project_outsider.request("POST", "/events/test")
  project_reader.request("POST", "/events/test")
  project_writer.request("POST", "/events/test")
  project_admin.request("POST", "/events/test")
  server_admin.request("POST", "/events/test")

  # Any logged-in user can browse a remote filesystem.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.request("POST", "/browse", headers={"content-type":"application/json"}, data=json.dumps({"username":"nobody", "hostname":"nowhere.com", "password":"nothing", "path":"/home/nobody"}))
  with nose.tools.assert_raises_regexp(Exception, "Remote connection failed."):
    project_outsider.request("POST", "/browse", headers={"content-type":"application/json"}, data=json.dumps({"username":"nobody", "hostname":"nowhere.com", "password":"nothing", "path":"/home/nobody"}))
  with nose.tools.assert_raises_regexp(Exception, "Remote connection failed."):
    project_reader.request("POST", "/browse", headers={"content-type":"application/json"}, data=json.dumps({"username":"nobody", "hostname":"nowhere.com", "password":"nothing", "path":"/home/nobody"}))
  with nose.tools.assert_raises_regexp(Exception, "Remote connection failed."):
    project_writer.request("POST", "/browse", headers={"content-type":"application/json"}, data=json.dumps({"username":"nobody", "hostname":"nowhere.com", "password":"nothing", "path":"/home/nobody"}))
  with nose.tools.assert_raises_regexp(Exception, "Remote connection failed."):
    project_admin.request("POST", "/browse", headers={"content-type":"application/json"}, data=json.dumps({"username":"nobody", "hostname":"nowhere.com", "password":"nothing", "path":"/home/nobody"}))
  with nose.tools.assert_raises_regexp(Exception, "Remote connection failed."):
    server_admin.request("POST", "/browse", headers={"content-type":"application/json"}, data=json.dumps({"username":"nobody", "hostname":"nowhere.com", "password":"nothing", "path":"/home/nobody"}))

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
    server_outsider.create_project("test")
  project_outsider.create_project("test")
  project_reader.create_project("test")
  project_writer.create_project("test")
  project_admin.create_project("test")
  server_admin.create_project("test")

  # Create a project to use for the remaining tests.
  pid = project_admin.create_project("security-test")
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

  # Any project member can request the project design page.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.request("GET", "/projects/%s/design" % pid)
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.request("GET", "/projects/%s/design" % pid)
  project_reader.request("GET", "/projects/%s/design" % pid)
  project_writer.request("GET", "/projects/%s/design" % pid)
  project_admin.request("GET", "/projects/%s/design" % pid)
  server_admin.request("GET", "/projects/%s/design" % pid)

  # Any project member (not just writers) can save a bookmark.
  bookmarks = []
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    bid = server_outsider.store_bookmark(pid, sample_bookmark)
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    bid = project_outsider.store_bookmark(pid, sample_bookmark)
  bid = project_reader.store_bookmark(pid, sample_bookmark)
  bid = project_writer.store_bookmark(pid, sample_bookmark)
  bid = project_admin.store_bookmark(pid, sample_bookmark)
  bid = server_admin.store_bookmark(pid, sample_bookmark)

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
    models.append(server_outsider.create_model(pid, "generic", "test-model"))
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    models.append(project_outsider.create_model(pid, "generic", "test-model"))
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    models.append(project_reader.create_model(pid, "generic", "test-model"))
  models.append(project_writer.create_model(pid, "generic", "test-model"))
  models.append(project_admin.create_model(pid, "generic", "test-model"))
  models.append(server_admin.create_model(pid, "generic", "test-model"))

  # Any project writer can store a model parameter.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.store_parameter(models[0], "pi", 3.1415)
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.store_parameter(models[0], "pi", 3.1415)
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_reader.store_parameter(models[0], "pi", 3.1415)
  project_writer.store_parameter(models[0], "pi", 3.1415)
  project_admin.store_parameter(models[0], "pi", 3.1415)
  server_admin.store_parameter(models[0], "pi", 3.1415)

  # Any project writer can start an arrayset artifact.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.start_array_set(models[0], "data")
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.start_array_set(models[0], "data")
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_reader.start_array_set(models[0], "data")
  project_writer.start_array_set(models[0], "data")
  project_admin.start_array_set(models[0], "data")
  server_admin.start_array_set(models[0], "data")

  # Any project writer can start an array.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.start_array(models[0], "data", 0, ("value", "int64"), ("i", "int64", 0, 10))
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.start_array(models[0], "data", 0, ("value", "int64"), ("i", "int64", 0, 10))
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_reader.start_array(models[0], "data", 0, ("value", "int64"), ("i", "int64", 0, 10))
  project_writer.start_array(models[0], "data", 0, ("value", "int64"), ("i", "int64", 0, 10))
  project_admin.start_array(models[0], "data", 0, ("value", "int64"), ("i", "int64", 0, 10))
  server_admin.start_array(models[0], "data", 0, ("value", "int64"), ("i", "int64", 0, 10))

  # Any project writer can store an array attribute.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.store_array_attribute(models[0], "data", 0, 0, numpy.arange(10))
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.store_array_attribute(models[0], "data", 0, 0, numpy.arange(10))
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_reader.store_array_attribute(models[0], "data", 0, 0, numpy.arange(10))
  project_writer.store_array_attribute(models[0], "data", 0, 0, numpy.arange(10))
  project_admin.store_array_attribute(models[0], "data", 0, 0, numpy.arange(10))
  server_admin.store_array_attribute(models[0], "data", 0, 0, numpy.arange(10))

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
    server_outsider.copy_inputs(models[0], models[1])
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.copy_inputs(models[0], models[1])
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_reader.copy_inputs(models[0], models[1])
  project_writer.copy_inputs(models[0], models[1])
  project_admin.copy_inputs(models[0], models[1])
  server_admin.copy_inputs(models[0], models[1])

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
    server_outsider.finish_model(models[0])
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.finish_model(models[0])
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_reader.finish_model(models[0])
  project_writer.finish_model(models[0])
  project_admin.finish_model(models[1])
  server_admin.finish_model(models[2])

  # Any project member can request the list of project models.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.get_project_models(pid)
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.get_project_models(pid)
  project_reader.get_project_models(pid)
  project_writer.get_project_models(pid)
  project_admin.get_project_models(pid)
  server_admin.get_project_models(pid)

  # Any project member can get a model.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.get_model(models[0])
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.get_model(models[0])
  project_reader.get_model(models[0])
  project_writer.get_model(models[0])
  project_admin.get_model(models[0])
  server_admin.get_model(models[0])

  # Any project member can get a model design page.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.request("GET", "/models/%s/design" % models[0])
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.request("GET", "/models/%s/design" % models[0])
  project_reader.request("GET", "/models/%s/design" % models[0])
  project_writer.request("GET", "/models/%s/design" % models[0])
  project_admin.request("GET", "/models/%s/design" % models[0])
  server_admin.request("GET", "/models/%s/design" % models[0])

  # Any project member can retrieve a model file.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.request("GET", "/models/%s/files/foo" % models[0])
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.request("GET", "/models/%s/files/foo" % models[0])
  with nose.tools.assert_raises_regexp(Exception, "^404"):
    project_reader.request("GET", "/models/%s/files/foo" % models[0])
  with nose.tools.assert_raises_regexp(Exception, "^404"):
    project_writer.request("GET", "/models/%s/files/foo" % models[0])
  with nose.tools.assert_raises_regexp(Exception, "^404"):
    project_admin.request("GET", "/models/%s/files/foo" % models[0])
  with nose.tools.assert_raises_regexp(Exception, "^404"):
    server_admin.request("GET", "/models/%s/files/foo" % models[0])

  # Any project member can retrieve model array metadata.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.get_model_array_metadata(models[0], "data", 0)
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.get_model_array_metadata(models[0], "data", 0)
  project_reader.get_model_array_metadata(models[0], "data", 0)
  project_writer.get_model_array_metadata(models[0], "data", 0)
  project_admin.get_model_array_metadata(models[0], "data", 0)
  server_admin.get_model_array_metadata(models[0], "data", 0)

  # Any project member can retrieve model array chunks.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.get_model_array_chunk(models[0], "data", 0, 0, 10)
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.get_model_array_chunk(models[0], "data", 0, 0, 10)
  project_reader.get_model_array_chunk(models[0], "data", 0, 0, 10)
  project_writer.get_model_array_chunk(models[0], "data", 0, 0, 10)
  project_admin.get_model_array_chunk(models[0], "data", 0, 0, 10)
  server_admin.get_model_array_chunk(models[0], "data", 0, 0, 10)

  # Any project member can retrieve model table metadata.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.get_model_table_metadata(models[0], "data", 0)
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.get_model_table_metadata(models[0], "data", 0)
  project_reader.get_model_table_metadata(models[0], "data", 0)
  project_writer.get_model_table_metadata(models[0], "data", 0)
  project_admin.get_model_table_metadata(models[0], "data", 0)
  server_admin.get_model_table_metadata(models[0], "data", 0)

  # Any project member can retrieve model table chunks.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.get_model_table_chunk(models[0], "data", 0, range(10), range(1))
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.get_model_table_chunk(models[0], "data", 0, range(10), range(1))
  project_reader.get_model_table_chunk(models[0], "data", 0, range(10), range(1))
  project_writer.get_model_table_chunk(models[0], "data", 0, range(10), range(1))
  project_admin.get_model_table_chunk(models[0], "data", 0, range(10), range(1))
  server_admin.get_model_table_chunk(models[0], "data", 0, range(10), range(1))

  # Any project member can retrieve model table sorted indices.
  with nose.tools.assert_raises_regexp(Exception, "^401"):
    server_outsider.get_model_table_sorted_indices(models[0], "data", 0, range(5))
  with nose.tools.assert_raises_regexp(Exception, "^403"):
    project_outsider.get_model_table_sorted_indices(models[0], "data", 0, range(5))
  project_reader.get_model_table_sorted_indices(models[0], "data", 0, range(5))
  project_writer.get_model_table_sorted_indices(models[0], "data", 0, range(5))
  project_admin.get_model_table_sorted_indices(models[0], "data", 0, range(5))
  server_admin.get_model_table_sorted_indices(models[0], "data", 0, range(5))

  # Any project member can retrieve model table unsorted indices.
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
  pid = project_admin.create_project("security-test")
  project_admin.put_project(pid, {"acl":sample_acl})

  # Server admins can delete any project.
  server_admin.delete_project(pid)

