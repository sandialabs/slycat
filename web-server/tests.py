# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import nose
import numpy
import requests
import slycat.web.client
import shutil
import subprocess
import sys
import time

server_process = None
connection = None

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
  nose.tools.assert_equal(len(projects), 2)

  connection.delete_project(pid2)
  connection.delete_project(pid1)
  projects = connection.get_projects()
  nose.tools.assert_equal(projects, [])

def test_project():
  pid = connection.create_project("test-project", "My test project.")

  project = connection.get_project(pid)
  nose.tools.assert_equal(project["name"], "test-project")
  nose.tools.assert_equal(project["description"], "My test project.")
  nose.tools.assert_equal(project["creator"], "slycat")
  nose.tools.assert_equal(project["acl"], {'administrators': [{'user': 'slycat'}], 'writers': [], 'readers': []})

  connection.put_project(pid, {"name":"modified-project", "description":"My modified project.", "acl":{"administrators":[{"user":"slycat"}], "writers":[{"user":"foo"}], "readers":[{"user":"bar"}]}})
  project = connection.get_project(pid)
  nose.tools.assert_equal(project["name"], "modified-project")
  nose.tools.assert_equal(project["description"], "My modified project.")
  nose.tools.assert_equal(project["acl"], {'administrators': [{'user': 'slycat'}], 'writers': [{"user":"foo"}], 'readers': [{"user":"bar"}]})

  connection.delete_project(pid)
  with nose.tools.assert_raises(requests.HTTPError):
    project = connection.get_project(pid)
