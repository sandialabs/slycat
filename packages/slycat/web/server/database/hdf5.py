# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import h5py
import os
import threading
import types

def dtype(type):
  """Convert a string attribute type into a dtype suitable for use with h5py."""
  if type not in dtype.type_map.keys():
    raise Exception("Unsupported type: {}".format(type))
  return dtype.type_map[type]
dtype.type_map = {"int8":"int8", "int16":"int16", "int32":"int32", "int64":"int64", "uint8":"uint8", "uint16":"uint16", "uint32":"uint32", "uint64":"uint64", "float32":"float32", "float64":"float64", "string":h5py.special_dtype(vlen=unicode), "float":"float32", "double":"float64"}

def make_path(array, path):
  return os.path.join(path, array[0:2], array[2:4], array[4:6], array + ".hdf5")

def path(array):
  """Convert an array identifier to a data store filesystem path."""
  if path.root is None:
    path.root = cherrypy.tree.apps[""].config["slycat"]["data-store"]
  return make_path(array, path.root)
path.root = None

def wrap(file):
  """Adds convenience functions to an h5py.File object."""
  def get_array(self, array):
    return self["array/{}".format(array)]
  def get_array_shape(self, array):
    array_metadata = self["array/{}".format(array)].attrs
    dimension_begin = array_metadata["dimension-begin"]
    dimension_end = array_metadata["dimension-end"]
    return tuple([end - begin for begin, end in zip(dimension_begin, dimension_end)])
  def get_array_attribute(self, array, attribute):
    return self["array/{}/attribute/{}".format(array, attribute)]

  file.array = types.MethodType(get_array, file, file.__class__)
  file.array_shape = types.MethodType(get_array_shape, file, file.__class__)
  file.array_attribute = types.MethodType(get_array_attribute, file, file.__class__)
  return file

def create(array):
  "Create a new array in the data store, ready for writing."""
  array_path = path(array)
  cherrypy.log.error("Creating file {}".format(array_path))
  os.makedirs(os.path.dirname(array_path))
  return wrap(h5py.File(array_path, mode="w"))

def open(array):
  """Open an array from the data store for reading."""
  array_path = path(array)
  cherrypy.log.error("Opening file {}".format(array_path))
  return wrap(h5py.File(array_path, mode="r"))

def delete(array):
  """Remove an array from the data store."""
  array_path = path(array)
  cherrypy.log.error("Deleting file {}".format(array_path))
  os.remove(array_path)

class null_lock(object):
  """Do-nothing replacement for a thread lock, useful for debugging threading problems with h5py."""
  def __enter__(self):
    pass
  def __exit__(self, exc_type, exc_value, traceback):
    pass

#lock = null_lock()
lock = threading.Lock()
