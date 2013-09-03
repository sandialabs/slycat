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

def test_test_array_chunker_json():
  wid = connection.create_test_array_chunker([4, 4])

  metadata = connection.get_array_chunker_metadata(wid)
  nose.tools.assert_equal(metadata["attributes"], [{"name":"a0", "type":"float64"}])
  nose.tools.assert_equal(metadata["dimensions"], [{"begin":0, "end":4, "name":"d0", "type":"int64"}, {"begin":0, "end":4, "name":"d1", "type":"int64"}])

  chunk = connection.get_array_chunker_chunk(wid, [0], [0, 3, 0, 2])
  nose.tools.assert_equal(chunk["attributes"], [0])
  nose.tools.assert_equal(chunk["ranges"], [[0, 3], [0, 2]])
  nose.tools.assert_equal(chunk["data"], [[[0, 1], [4, 5], [8, 9]]])

  connection.delete_worker(wid, stop=True)

def test_test_array_chunker_binary():
  wid = connection.create_test_array_chunker([4, 4])

  metadata = connection.get_array_chunker_metadata(wid)
  nose.tools.assert_equal(metadata["attributes"], [{"name":"a0", "type":"float64"}])
  nose.tools.assert_equal(metadata["dimensions"], [{"begin":0, "end":4, "name":"d0", "type":"int64"}, {"begin":0, "end":4, "name":"d1", "type":"int64"}])

  chunk = numpy.frombuffer(connection.get_array_chunker_binary_chunk(wid, 0, [0, 3, 0, 2], byteorder="little"), dtype="<f8").reshape((3, 2))
  numpy.testing.assert_array_equal(chunk, [[0, 1], [4, 5], [8, 9]])

  chunk = numpy.frombuffer(connection.get_array_chunker_binary_chunk(wid, 0, [0, 3, 0, 2], byteorder="big"), dtype=">f8").reshape((3, 2))
  numpy.testing.assert_array_equal(chunk, [[0, 1], [4, 5], [8, 9]])

  connection.delete_worker(wid, stop=True)
