# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import nose
import numpy
import slycat.web.client
import subprocess
import sys
import time

server_process = None
connection = None

def setup():
  global server_process, connection
  server_process = subprocess.Popen(["python", "slycat-web-server.py", "--config=test-config.ini"])
  time.sleep(2.0)
  connection = slycat.web.client.connection(host="https://localhost:8093", proxies={"http":"", "https":""}, verify=False, auth=("slycat", "slycat"), log=slycat.web.client.dev_null())

def teardown():
  global server_process
  server_process.terminate()
  server_process.wait()

