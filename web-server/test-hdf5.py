# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import h5py
import nose
import numpy
import numpy.testing
import os
import sys
import threading

test_file = "test.hdf5"

def setup():
  # Remove old test data.
  if os.path.exists(test_file):
    os.remove(test_file)

  # Create a new file for testing.
  with h5py.File(test_file, "w") as file:
    for attribute in range(10):
      file["array/0/attribute/%s" % attribute] = numpy.random.random(1000)

def teardown():
  pass

def reading(file, repeat):
  for i in range(repeat):
    for attribute in file["array/0/attribute"]:
      data = file["array/0/attribute"][attribute][...]


def test_one_thread_one_file():
  file = h5py.File(test_file, "r")
  threads = [threading.Thread(target=reading, args=(file, 1000)) for i in range(1)]
  for thread in threads:
    thread.start()
  for thread in threads:
    thread.join()
  file.close()

def test_two_threads_one_file():
  file = h5py.File(test_file, "r")
  threads = [threading.Thread(target=reading, args=(file, 1000)) for i in range(2)]
  for thread in threads:
    thread.start()
  for thread in threads:
    thread.join()
  file.close()

def test_four_threads_one_file():
  file = h5py.File(test_file, "r")
  threads = [threading.Thread(target=reading, args=(file, 1000)) for i in range(4)]
  for thread in threads:
    thread.start()
  for thread in threads:
    thread.join()
  file.close()

def test_two_threads_two_files():
  files = [h5py.File(test_file, "r") for i in range(2)]
  threads = [threading.Thread(target=reading, args=(file, 1000)) for file in files]
  for thread in threads:
    thread.start()
  for thread in threads:
    thread.join()
  for file in files:
    file.close()

def test_four_threads_four_files():
  files = [h5py.File(test_file, "r") for i in range(4)]
  threads = [threading.Thread(target=reading, args=(file, 1000)) for file in files]
  for thread in threads:
    thread.start()
  for thread in threads:
    thread.join()
  for file in files:
    file.close()

