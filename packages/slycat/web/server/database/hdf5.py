# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import h5py
import os

def path(array):
  """Convert an array identifier to a data store filesystem path."""
  if path.root is None:
    path.root = cherrypy.tree.apps[""].config["slycat"]["data-store"]
  return os.path.join(path.root, array[0:2], array[2:4], array[4:] + ".hdf5")
path.root = None

def create(array):
  "Create a new array in the data store, ready for writing."""
  array_path = path(array)
  cherrypy.log.error("Creating file {}".format(array_path))
  os.makedirs(os.path.dirname(array_path))
  return h5py.File(array_path, mode="w")

def open(array):
  """Open an array from the data store for reading."""
  array_path = path(array)
  cherrypy.log.error("Opening file {}".format(array_path))
  return h5py.File(array_path, mode="r")

