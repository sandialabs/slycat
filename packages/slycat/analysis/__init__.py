# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

"""Parallel streaming data analysis.

Slycat Analysis provides a Pythonic API for interactive exploratory analysis of
remote, multi-dimension, multi-attribute arrays.  Using Slycat Analysis, you
connect to a running Slycat Analysis Coordinator to create, load, and
manipulate arrays that are distributed across one-to-many Slycat Analysis
Workers for parallel computation.  Further, arrays are split into chunks that
are streamed through the system, so you can manipulate arrays that are larger
than the available system memory.
"""

from functools import wraps
from slycat.analysis.api import InvalidArgument
import logging
import numpy
import Pyro4
import sys
import time
import ast

handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))

log = logging.getLogger("slycat.analysis.client")
log.setLevel(logging.DEBUG)
log.addHandler(handler)

Pyro4.config.SERIALIZER = "pickle"

sys.excepthook = Pyro4.util.excepthook

class connection(object):
  def __init__(self, nameserver):
    self.nameserver = nameserver
    self.proxy = Pyro4.Proxy(nameserver.lookup("slycat.coordinator"))

  def require_attribute_name(self, name):
    if not isinstance(name, basestring):
      raise InvalidArgument("Attribute name must be a string.")
    return name

  def require_attribute_type(self, type):
    allowed_types = ["int8", "int16", "int32", "int64", "uint8", "uint16", "uint32", "uint64", "float32", "float64", "string"]
    if type not in allowed_types:
      raise InvalidArgument("Attribute type must be one of %s" % ",".join(allowed_types))
    return type

  def require_attribute(self, attribute):
    if isinstance(attribute, basestring):
      attribute = {"name":attribute, "type":"float64"}
    elif isinstance(attribute, tuple):
      if len(attribute) != 2:
        raise InvalidArgument("Attribute must have a name and a type.")
      attribute = {"name":attribute[0], "type":attribute[1]}
    elif isinstance(attribute, dict):
      if "name" not in attribute:
        raise InvalidArgument("Attribute must have a name.")
      if "type" not in attribute:
        raise InvalidArgument("Attribute must have a type.")
    self.require_attribute_name(attribute["name"])
    self.require_attribute_type(attribute["type"])
    return attribute

  def require_attributes(self, attributes):
    if isinstance(attributes, basestring):
      attributes = [self.require_attribute(attributes)]
    elif isinstance(attributes, tuple):
      attributes = [self.require_attribute(attributes)]
    elif isinstance(attributes, dict):
      attributes = [self.require_attribute(attributes)]
    else:
      attributes = [self.require_attribute(attribute) for attribute in attributes]
    return attributes

  def require_attribute_names(self, names):
    if isinstance(names, basestring):
      return [self.require_attribute_name(names)]
    return [self.require_attribute_name(name) for name in names]

  def require_chunk_sizes(self, shape, chunk_sizes):
    """Return array chunk sizes (tuple of dimension lengths), treating a single integer as a 1-tuple and sanity-checking the results against an array shape."""
    if chunk_sizes is None:
      chunk_sizes = shape
    elif isinstance(chunk_sizes, int):
      chunk_sizes = tuple([chunk_sizes])
    else:
      chunk_sizes = tuple(chunk_sizes)
    if len(shape) != len(chunk_sizes):
      raise InvalidArgument("Array shape and chunk sizes must contain the same number of dimensions.")
    return chunk_sizes

  def require_dimension_name(self, name):
    if not isinstance(name, basestring):
      raise InvalidArgument("Dimension name must be a string.")
    return name

  def require_dimension_names(self, names):
    if isinstance(names, basestring):
      return [self.require_dimension_name(names)]
    return [self.require_dimension_name(name) for name in names]

  def require_expression(self, expression):
    if isinstance(expression, basestring):
      expression = ast.parse(expression)
    else:
      raise InvalidArgument("Expression must be a string.")
    return expression

  def require_object(self, object):
    """Lookup a Pyro URI, returning the corresponding Python object."""
    return object.proxy._pyroUri

  def require_shape(self, shape):
    """Return an array shape (tuple of dimension lengths), treating a single integer as a 1-tuple."""
    if isinstance(shape, int):
      shape = tuple([shape])
    else:
      shape = tuple(shape)
    if not len(shape):
      raise InvalidArgument("Array shape must have at least one dimension.")
    return shape

  def load(self, path, schema="csv-file", **keywords):
    """Load an array from a filesystem.

    Use the required parameter path to specify the location of the data to be
    loaded.  Note that the data is loaded remotely by the connected Slycat Analysis
    workers, from the workers' filesystems, not the client's, and that you will have
    to ensure that the same path refers to the same data across every worker.

    By default, the data to be loaded is assumed to be contained in a single
    CSV (delimited-text) file.  You may override this with the optional schema
    parameter, which specifies the data's organization on disk.  Note that a
    particular schema will capture both the data file format (CSV, PRN,
    ExodusII), and its layout on disk (one file, multiple partitioned files,
    etc).  Depending on the schema, you may need to provide additional
    schema-specific keyword parameters when calling load().  The
    currently-supported schemas are:

      csv-file    Loads data from a single CSV file, partitioned in round-robin
                  order among workers.  Use the "delimiter" parameter to specify the field
                  delimiter, which defaults to ",".  If the "format" parameter is None (the
                  default), every attribute in the output array will be of type "string".
                  Pass a list of types to "format" to specify alternate attribute types in
                  the output array.  Use the "chunk_size" parameter to specify the maximum
                  chunk size of the output array.  Otherwise, the file will be evenly split
                  into N chunks, one on each of N workers.

      prn-file    Loads data from a single PRN file, partitioned in round-robin
                  order among workers.  Use the "chunk_size" parameter to specify the
                  maximum chunk size of the output array.  Otherwise, the file will be
                  evenly split into N chunks, one on each of N workers.
    """
    return remote_file_array(self.proxy.load(path, schema, **keywords))

class remote_array(object):
  """Proxy for a remote, multi-dimension, multi-attribute array.

  Attributes:
    attributes    A sequence of dicts that describe the name and type of each array attribute.
    dimensions    A sequence of dicts that describe the name, type, size, and chunk-size of each array dimension.
    ndim          The number of dimensions in the array.
    shape         The size of the array along each dimension.
    size          The number of cells in the array.
  """
  def __init__(self, proxy):
    self.proxy = proxy
    self._dimensions = None
    self._attributes = None
  def __del__(self):
    self.proxy.release()
  def __getattr__(self, name):
    if name == "attributes":
      if self._attributes is None:
        self._attributes = self.proxy.attributes()
      return self._attributes
    elif name == "dimensions":
      if self._dimensions is None:
        self._dimensions = self.proxy.dimensions()
      return self._dimensions
    elif name == "ndim":
      return len(self.dimensions)
    elif name == "shape":
      return tuple([dimension["end"] - dimension["begin"] for dimension in self.dimensions])
    elif name == "size":
      return numpy.prod([dimension["end"] - dimension["begin"] for dimension in self.dimensions])
  def __setattr__(self, name, value):
    if name in ["attributes", "dimensions", "ndim", "shape", "size"]:
      raise Exception("{} attribute is read-only.".format(name))
    object.__setattr__(self, name, value)
  def __repr__(self):
    if len(self.dimensions) > 1:
      shape_repr = "x".join([str(dimension["end"] - dimension["begin"]) for dimension in self.dimensions])
    else:
      dimension = self.dimensions[0]
      shape_repr = "{} element".format(dimension["end"] - dimension["begin"])

    dimensions_repr = [dimension["name"] for dimension in self.dimensions]
    dimensions_repr = ", ".join(dimensions_repr)
    if len(self.dimensions) > 1:
      dimensions_repr = "dimensions: " + dimensions_repr
    else:
      dimensions_repr = "dimension: " + dimensions_repr

    attributes_repr = [attribute["name"] for attribute in self.attributes]
    if len(self.attributes) > 6:
      attributes_repr = attributes_repr[:3] + ["..."] + attributes_repr[-3:]
    attributes_repr = ", ".join(attributes_repr)
    if len(self.attributes) > 1:
      attributes_repr = "attributes: " + attributes_repr
    else:
      attributes_repr = "attribute: " + attributes_repr
    return "<{} remote array with {} and {}>".format(shape_repr, dimensions_repr, attributes_repr)
  def chunks(self):
    """Return an iterator over the array's chunks.

    Iterating over an array's chunks allows you to access the contents of the
    array on the client while limiting memory consumption.  Note that sending the
    contents of the array to the client may still consume considerable bandwidth,
    so you should try to perform as many remote operations as possible before
    sending the results to the client.
    """
    iterator = self.proxy.iterator()
    try:
      while True:
        iterator.next()
        yield array_chunk(iterator, self.attributes)
    except StopIteration:
      iterator.release()
    except:
      iterator.release()
      raise

class remote_file_array(remote_array):
  """Proxy for a remote, multi-dimension, multi-attribute array that was loaded from a single file."""
  def __init__(self, proxy):
    remote_array.__init__(self, proxy)
  def file_path(self):
    """Return the path to the loaded file."""
    return self.proxy.file_path()
  def file_size(self):
    """Return the size in bytes of the loaded file."""
    return self.proxy.file_size()

class array_chunk(object):
  """Proxy for a chunk from a remote, multi-dimension, multi-attribute array."""
  def __init__(self, proxy, attributes):
    self._proxy = proxy
    self._attributes = attributes
  def __repr__(self):
    shape = self.shape()
    if len(shape) > 1:
      shape_repr = "x".join([str(size) for size in shape])
    else:
      shape_repr = "{} element".format(shape[0])

    coordinates = self.coordinates()
    coordinates_repr = ", ".join([str(coordinate) for coordinate in coordinates])
    return "<{} remote array chunk at coordinates {}>".format(shape_repr, coordinates_repr)
  def coordinates(self):
    """Return a numpy array containing the coordinates of this chunk.

    A chunk's coordinates are the lowest-numbered coordinates along each
    dimension for that chunk.
    """
    return self._proxy.coordinates()
  def shape(self):
    """Return a numpy array containing the shape of this chunk.

    A chunk's shape is the size of the chunk along each of its dimensions.
    """
    return self._proxy.shape()
  def attributes(self):
    """Return an iterator over the attributes within this chunk."""
    for index, attribute in enumerate(self._attributes):
      yield array_chunk_attribute(self._proxy, index, attribute)
  def values(self, n):
    """Return a numpy array containing the values of attribute n for this chunk."""
    return self._proxy.values(n)

class array_chunk_attribute(object):
  """Proxy for an individual chunk-attribute from a remote, multi-dimension, multi-attribute array."""
  def __init__(self, proxy, index, attribute):
    self.proxy = proxy
    self.index = index
    self.attribute = attribute
  def __repr__(self):
    return "<remote array chunk attribute: {}>".format(self.name())
  def name(self):
    """Return the name of the attribute."""
    return self.attribute["name"]
  def type(self):
    """Return the type of the attribute."""
    return self.attribute["type"]
  def values(self):
    """Return a numpy array containing the values of the attribute for this chunk."""
    return self.proxy.values(self.index)

current_connection = None

def connect(host="127.0.0.1", port=9090, hmac_key = "slycat1"):
  """Return a connection to a running Slycat Analysis Coordinator.

  Note that you only need to call connect() explicitly when supplying your own
  parameters.  Otherwise, connect() will be called automatically when you use
  any of the other functions in this module.

  You will likely never need to call connect() more than once or keep track of
  the returned connection object, unless you need to manage connections to more
  than one Slycat Analysis Coordinator.
  """
  global current_connection
  Pyro4.config.HMAC_KEY = hmac_key
  nameserver = Pyro4.locateNS(host, port)
  current_connection = connection(nameserver)
  return current_connection

def get_connection():
  """Return the current (most recent) connection."""
  if current_connection is None:
    connect()
  return current_connection

def load(path, schema="csv-file", **keywords):
  return get_connection().load(path, schema, **keywords)
load.__doc__ = connection.load.__doc__

connection.InvalidArgument = InvalidArgument
connection.remote_array = remote_array

def load_plugins(root):
  import imp
  import os

  operators = []

  def make_connection_method(function):
    def implementation(self, *arguments, **keywords):
      return function(self, *arguments, **keywords)
    implementation.__name__ = function.__name__
    implementation.__doc__ = function.__doc__
    return implementation

  def make_standalone_method(function):
    def implementation(*arguments, **keywords):
      return function(get_connection(), *arguments, **keywords)
    implementation.__name__ = function.__name__
    implementation.__doc__ = function.__doc__
    return implementation

  class plugin_context(object):
    def add_operator(self, name, function):
      if name in operators:
        raise Exception("Cannot load operator with duplicate name: %s" % name)
      operators.append(name)
      setattr(connection, name, make_connection_method(function))
      globals()[name] = make_standalone_method(function)
      #log.debug("Registered operator %s", name)
  context = plugin_context()

  plugin_dirs = [os.path.join(os.path.dirname(os.path.realpath(root)), "plugins")]
  for plugin_dir in plugin_dirs:
    try:
      log.info("Loading plugins from %s", plugin_dir)
      plugin_names = [x[:-3] for x in os.listdir(plugin_dir) if x.endswith(".py")]
      for plugin_name in plugin_names:
        try:
          module_fp, module_pathname, module_description = imp.find_module(plugin_name, [plugin_dir])
          plugin = imp.load_module(plugin_name, module_fp, module_pathname, module_description)
          if hasattr(plugin, "register_client_plugin"):
            plugin.register_client_plugin(context)
        except Exception as e:
          import traceback
          log.error(traceback.format_exc())
        finally:
          if module_fp:
            module_fp.close()
    except Exception as e:
      import traceback
      log.error(traceback.format_exc())
  log.info("Loaded operators: %s", ", ".join(sorted(operators)))

import __main__
if not __main__.__dict__.get("slycat_analysis_disable_client_plugins", False):
  load_plugins(__file__)

