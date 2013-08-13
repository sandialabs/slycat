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

class connection(object):
  plugin_functions = {}
  def __init__(self, nameserver):
    import Pyro4
    self.nameserver = nameserver
    self.proxy = Pyro4.Proxy(nameserver.lookup("slycat.coordinator"))
  def require_object(self, object):
    """Lookup the Pyro URI for a Python object."""
    return object.proxy._pyroUri
  def call_plugin_function(self, name, *arguments, **keywords):
    """Call a plugin function by name."""
    return connection.plugin_functions[name](self, *arguments, **keywords)
  def create_remote_array(self, name, sources, *arguments, **keywords):
    """Creates a remote array using plugin functions on the workers."""
    return remote_array(self.proxy.create_remote_array(name, [self.require_object(source) for source in sources], *arguments, **keywords))
  def create_remote_file_array(self, name, sources, *arguments, **keywords):
    """Creates a remote array using plugin functions on the workers."""
    return remote_file_array(self.proxy.create_remote_array(name, [self.require_object(source) for source in sources], *arguments, **keywords))

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
      import numpy
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
  import Pyro4
  Pyro4.config.HMAC_KEY = hmac_key
  nameserver = Pyro4.locateNS(host, port)
  current_connection = connection(nameserver)
  return current_connection

def get_connection():
  """Return the current (most recent) connection."""
  if current_connection is None:
    connect()
  return current_connection

connection.remote_array = remote_array
connection.remote_file_array = remote_file_array

def __setup_module():
  # Configure Pyro4 ...
  import Pyro4
  Pyro4.config.SERIALIZER = "pickle"

  # Enable remote exception handling ...
  import sys
  sys.excepthook = Pyro4.util.excepthook

  # Load plugins ...
  import os
  import slycat.analysis.plugin
  import slycat.analysis.plugin.client
  __plugins = slycat.analysis.plugin.manager(slycat.analysis.plugin.client.log)
  for plugin_directory in [path for path in os.environ.get("SLYCAT_ANALYSIS_EXTRA_PLUGINS", "").split(":") if path]:
    __plugins.load(plugin_directory)
  __plugins.load(os.path.join(os.path.dirname(os.path.realpath(__file__)), "..", "plugins"))

  for module in __plugins.modules:
    if hasattr(module, "register_client_plugin"):
      module.register_client_plugin(__plugins)

  for module in __plugins.modules:
    if hasattr(module, "finalize_plugins"):
      module.finalize_plugins(__plugins)

  def __make_connection_method(function):
    def implementation(self, *arguments, **keywords):
      return function(self, *arguments, **keywords)
    implementation.__name__ = function.__name__
    implementation.__doc__ = function.__doc__
    return implementation

  def __make_standalone_method(function):
    def implementation(*arguments, **keywords):
      return function(get_connection(), *arguments, **keywords)
    implementation.__name__ = function.__name__
    implementation.__doc__ = function.__doc__
    return implementation

  for name, (function, metadata) in __plugins.functions.items():
    setattr(connection, name, __make_connection_method(function))
    globals()[name] = __make_standalone_method(function)

  connection.plugin_functions = {name:function for name, (function, metadata) in __plugins.functions.items()}
__setup_module()

