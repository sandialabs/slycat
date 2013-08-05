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

  def aggregate(self, source, expressions):
    """Return an array containing one-or-more aggregates of a source array.

    The result is a one-dimensional array with a single cell containing
    aggregate attributes specified via one-or-more aggregate expressions by the
    caller.  An aggregate expression can take one of three forms:

      "function"            Apply an aggregate function to every attribute in
                            the source array.
      ("function", index)   Apply an aggregate function to a single source
                            attribute, identified by its index.
      ("function", "name")  Apply an aggregate function to a single source
                            attribute, identified by its name.

    The expressions parameter accepts a single expression or a list of
    one-or-more expressions.  The available aggregate functions are:

      avg       Compute the average value of an attribute.
      count     Compute the number of values stored in an attribute.
      distinct  Compute the number of distinct values stored in an attribute.
      max       Compute the maximum value of an attribute.
      min       Compute the minimum value of an attribute.
      sum       Compute the sum of an attribute's values.

    The attribute names in the result array will be a combination of the
    function name with the attribute name:

      >>> a = random(5, attributes=["b", "c"])

      >>> scan(aggregate(a, "min"))
        {i} min_b, min_c
      * {0} 0.183918811677, 0.595544702979

      >>> scan(aggregate(a, ("avg", 0)))
        {i} avg_b
      * {0} 0.440439153342

      >>> scan(aggregate(a, ("max", "c")))
        {i} max_c
      * {0} 0.964514519736

      >>> scan(aggregate(a, ["min", "max", ("count", 0), ("sum", "c")]))
        {i} min_b, min_c, max_b, max_c, count_b, sum_c
      * {0} 0.183918811677, 0.595544702979, 0.929616092817, 0.964514519736, 5, 3.61571282797
    """
    return remote_array(self.proxy.aggregate(source.proxy._pyroUri, expressions))
  def apply(self, source, attributes):
    """Add attributes based on mathmatical expressions to a source array.

    Creates a copy of a source array with one-or-more
    additional attributes computed using mathematical expressions.

    The attributes parameter may be a tuple containing an attribute and an
    expression, or a sequence of attribute, expression tuples.  Each attribute
    may be an attribute name, or a tuple containing the attribute name and
    type, which otherwise defaults to float64.  Each expression must be a
    string containing valid Python syntax, and may use any of the usual Python
    operators:

      +   Binary addition.
      &   Bitwise and (requires integer arguments).
      |   Bitwise or (requires integer arguments).
      ^   Bitwise xor (requires integer arguments).
      /   Binary division.
      //  Floor division.
      ==  Equality.
      >   Greater-than.
      >=  Greater-than or equal.
      ~   Invert / twos-complement (requires integer argument).
      <<  Left-shift (requires integer arguments).
      <   Less-than.
      <=  Less-than or equal.
      %   Modulo / remainder (requires integer arguments).
      *   Binary multiplication.
      not Boolean not.
      **  Power.
      >>  Right-shift (requires integer arguments).
      -   Binary subtraction.
      -   Negative (unary subtraction).
      +   Positive (unary addition).

    Expressions may refer to any of the source array dimensions or attributes
    by name.

      >>> a = random(5, attributes=["a", "b"])

      >>> scan(apply(a, ("c", "3.14")))
        {d0} a, b, c
      * {0} 0.929616092817, 0.595544702979, 3.14
        {1} 0.316375554582, 0.964514519736, 3.14
        {2} 0.183918811677, 0.653177096872, 3.14
        {3} 0.204560278553, 0.748906637534, 3.14
        {4} 0.567725029082, 0.653569870852, 3.14

      >>> scan(apply(a, ("sum", "a + b")))
        {d0} a, b, sum
      * {0} 0.929616092817, 0.595544702979, 1.5251607958
        {1} 0.316375554582, 0.964514519736, 1.28089007432
        {2} 0.183918811677, 0.653177096872, 0.837095908549
        {3} 0.204560278553, 0.748906637534, 0.953466916087
        {4} 0.567725029082, 0.653569870852, 1.22129489993

      >>> scan(apply(a, [("diff", "a - b"), (("d", "int64"), "d0 % 3")]))
        {d0} a, b, diff, d
      * {0} 0.929616092817, 0.595544702979, 0.334071389838, 0
        {1} 0.316375554582, 0.964514519736, -0.648138965154, 1
        {2} 0.183918811677, 0.653177096872, -0.469258285194, 2
        {3} 0.204560278553, 0.748906637534, -0.544346358981, 0
        {4} 0.567725029082, 0.653569870852, -0.08584484177, 1
    """
    return remote_array(self.proxy.apply(source.proxy._pyroUri, attributes))
  def array(self, initializer, attribute="val"):
    """Return an array containing client-supplied data.

    Creates an array with a single attribute, populated from a client-supplied
    initializer.  The initializer may be any numpy array, or any (arbitrarily
    nested) sequence.  Use the attribute parameter to specify the name of the
    resulting attribute, or a tuple with the attribute name and type, which
    otherwise defaults to float64.

    Because the array() operator copies data provided by the client, it is
    necessarily limited in scope to data that fits within the client's memory.
    Thus, the resulting array is presumed to be relatively small, e.g.
    parameters provided by a user, small lookup dictionaries, etc.  You should
    avoid using array() with "large" data, preferring to manipulate it all
    remotely instead.

      >>> scan(array([1, 2, 3]))
        {d0} val
      * {0} 1.0
        {1} 2.0
        {2} 3.0

      >>> scan(array([1, 2, 3], attribute="foo"))
        {d0} foo
      * {0} 1.0
        {1} 2.0
        {2} 3.0

      >>> scan(array([1, 2, 3], attribute=("foo", "int32")))
        {d0} foo
      * {0} 1
        {1} 2
        {2} 3

      >>> scan(array([[1, 2, 3], [4, 5, 6]]))
        {d0, d1} val
      * {0, 0} 1.0
        {0, 1} 2.0
        {0, 2} 3.0
        {1, 0} 4.0
        {1, 1} 5.0
        {1, 2} 6.0
    """
    return remote_array(self.proxy.array(initializer, attribute))
  def attributes(self, source):
    """Return an array that describes some other array's attributes.

    Creates a 1D array with attributes "name" and "type" and one cell for each
    of another array's attributes.  It is particularly useful when working with
    an array with a large number of attributes.

      >>> scan(attributes(load("../data/automobiles.csv", schema="csv-file", chunk_size=100)))
        {i} name, type
      * {0} Model, string
        {1} Origin, string
        {2} Year, string
        {3} Cylinders, string
        {4} Acceleration, string
        {5} Displacement, string
        {6} Horsepower, string
        {7} MPG, string
    """
    return remote_array(self.proxy.attributes(source.proxy._pyroUri))
  def build(self, shape, attributes, chunks=None):
    """Create an array with one-or-more attributes, each defined by an arbitrary expression.

    Creates an array with the given shape and chunk sizes, with one-or-more
    attributes computed using mathematical expressions.

    The shape parameter must be an int or a sequence of ints that specify the
    size of the array along each dimension.  The chunks parameter must an int
    or sequence of ints that specify the maximum size of an array chunk along
    each dimension, and must match the number of dimensions implied by the
    shape parameter.  If the chunks parameter is None (the default), the chunk
    sizes will be identical to the array shape, i.e. the array will have a
    single chunk.  This may be impractical for large arrays and prevents the
    array from being distributed across multiple workers.

    The attributes parameter may be a tuple containing an attribute and an
    expression, or a sequence of attribute, expression tuples.  Each attribute
    may be an attribute name, or a tuple containing the attribute name and
    type, which otherwise defaults to float64.  Each expression must be a
    string containing a valid Python expression, and may use any of the usual
    Python operators:

      +   Binary addition.
      &   Bitwise and (requires integer arguments).
      |   Bitwise or (requires integer arguments).
      ^   Bitwise xor (requires integer arguments).
      /   Binary division.
      //  Floor division.
      ==  Equality.
      >   Greater-than.
      >=  Greater-than or equal.
      ~   Invert / twos-complement (requires integer argument).
      <<  Left-shift (requires integer arguments).
      <   Less-than.
      <=  Less-than or equal.
      %   Modulo / remainder (requires integer arguments).
      *   Binary multiplication.
      not Boolean not.
      **  Power.
      >>  Right-shift (requires integer arguments).
      -   Binary subtraction.
      -   Negative (unary subtraction).
      +   Positive (unary addition).

    Expressions may refer to any of the array dimensions by name.

    >>> scan(build(4, ("val", "1")))
      {d0} val
    * {0} 1.0
      {1} 1.0
      {2} 1.0
      {3} 1.0

    >>> scan(build(4, ("val", "d0")))
      {d0} val
    * {0} 0.0
      {1} 1.0
      {2} 2.0
      {3} 3.0

    >>> scan(build(4, (("val", "int32"), "d0")))
      {d0} val
    * {0} 0
      {1} 1
      {2} 2
      {3} 3

      >>> scan(build(4, (("val", "int32"), "d0 ** 2")))
      {d0} val
    * {0} 0
      {1} 1
      {2} 4
      {3} 9

      >>> scan(build((3, 3), ("val", "d0 * 3 + d1")))
      {d0, d1} val
    * {0, 0} 0.0
      {0, 1} 1.0
      {0, 2} 2.0
      {1, 0} 3.0
      {1, 1} 4.0
      {1, 2} 5.0
      {2, 0} 6.0
      {2, 1} 7.0
      {2, 2} 8.0

      >>> scan(build(5, [("i", "d0"), ("i2", "d0 ** 2")]))
      {d0} i, i2
    * {0} 0.0, 0.0
      {1} 1.0, 1.0
      {2} 2.0, 4.0
      {3} 3.0, 9.0
      {4} 4.0, 16.0
    """
    return remote_array(self.proxy.build(shape, chunks, attributes))
  def chunk_map(self, source):
    """Return an array that describes how another array's data chunks are distributed.

    Creates a 1D array containing a cell for each chunk in the source array.
    Useful to understand how data is load balanced and to look for hot spots in
    workers.  A "worker" attribute contains the zero-based index of the worker
    where the chunk resides.  Since a worker is generally responsible for many
    chanks, the "index" array contains a zero-based index that identifies the
    chunk within its worker.  Note that the combination of "worker" and
    "index" can be used as a unique global identifier for a chunk.  There will be
    attributes "c[0, N)" - where N is the number of dimensions in the source
    array - storing the lowest-numbered coordinates of the chunk along each
    dimension.  Similarly, attributes "s[0, N]" store the shape of each chunk,
    i.e. its size along each dimension.

      >>> scan(chunk_map(random((100, 100), (40, 40))))
        {i} worker, index, c0, c1, s0, s1
      * {0} 0, 0, 0, 0, 40, 40
        {1} 0, 1, 0, 40, 40, 40
        {2} 0, 2, 0, 80, 40, 20
        {3} 1, 0, 40, 0, 40, 40
        {4} 1, 1, 40, 40, 40, 40
        {5} 2, 0, 40, 80, 40, 20
        {6} 2, 1, 80, 0, 20, 40
        {7} 3, 0, 80, 40, 20, 40
        {8} 3, 1, 80, 80, 20, 20
    """
    return remote_array(self.proxy.chunk_map(source.proxy._pyroUri))
  def dimensions(self, source):
    """Return an array that describe's another array's dimensions.

    Creates a 1D array with attributes "name", "type", "begin", "end", and
    "chunk-size" and one cell for each of the source array's dimensions.  It is
    particularly useful when working with an array with a large number of
    dimensions.

      >>> scan(dimensions(random((1000, 2000, 3000), (100, 100, 100))))
        {i} name, type, begin, end, chunk-size
      * {0} d0, int64, 0, 1000, 100
        {1} d1, int64, 0, 2000, 100
        {2} d2, int64, 0, 3000, 100
    """
    return remote_array(self.proxy.dimensions(source.proxy._pyroUri))
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

def aggregate(source, expressions):
  return get_connection().aggregate(source, expressions)
aggregate.__doc__ = connection.aggregate.__doc__

def apply(source, attributes):
  return get_connection().apply(source, attributes)
apply.__doc__ = connection.apply.__doc__

def array(initializer, attribute="val"):
  return get_connection().array(initializer, attribute)
array.__doc__ = connection.array.__doc__

def attributes(source):
  return get_connection().attributes(source)
attributes.__doc__ = connection.attributes.__doc__

def build(shape, attributes, chunks=None):
  return get_connection().build(shape, attributes, chunks)
build.__doc__ = connection.build.__doc__

def chunk_map(source):
  return get_connection().chunk_map(source)
chunk_map.__doc__ = connection.chunk_map.__doc__

def dimensions(source):
  return get_connection().dimensions(source)
dimensions.__doc__ = connection.dimensions.__doc__

def load(path, schema="csv-file", **keywords):
  return get_connection().load(path, schema, **keywords)
load.__doc__ = connection.load.__doc__

connection.InvalidArgument = InvalidArgument
connection.remote_array = remote_array

def load_plugins(root):
  import imp
  import os

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
      setattr(connection, name, make_connection_method(function))
      globals()[name] = make_standalone_method(function)
      log.info("Registered operator %s", name)
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

load_plugins(__file__)

