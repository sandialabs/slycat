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

# We probably need to rethink this - the problem is that decorators obscure function parameters in help().
def translate_exceptions(f):
  """Catch and re-raise certain exceptions to hide the fact that they were raised remotely."""
  @wraps(f)
  def wrapper(*arguments, **keywords):
    try:
      return f(*arguments, **keywords)
    except InvalidArgument as e:
      raise InvalidArgument(e)
  return wrapper

class connection(object):
  def __init__(self, nameserver):
    self.nameserver = nameserver
    self.proxy = Pyro4.Proxy(nameserver.lookup("slycat.coordinator"))
    self.proxy._pyroOneway.add("shutdown")

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
  def join(self, array1, array2):
    """Return an array combining the attributes of two arrays.

    The shape (number of dimensions, size, and chunk size of each dimension) of
    the two inputs must be identical.  The result array will have the same
    shape as the inputs, with the union of their attributes and dimension names
    chosen from the first input.

    Note that join() may create arrays with duplicate attribute names.  When
    this happens, most operators allow you to reference attributes by index for
    disambiguation.

      >>> scan(join(random(5, attributes="foo"), zeros(5, attributes="bar")))
        {d0} foo, bar
      * {0} 0.929616092817, 0.0
        {1} 0.316375554582, 0.0
        {2} 0.183918811677, 0.0
        {3} 0.204560278553, 0.0
        {4} 0.567725029082, 0.0
    """
    return remote_array(self.proxy.join(array1.proxy._pyroUri, array2.proxy._pyroUri))
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
  def materialize(self, source):
    """Return a materialized (loaded into memory) version of an array.

    Normally, array data is divided into chunks that are loaded and streamed
    through the system only when needed, allowing you to work with arrays that
    will not fit into memory.  The down-side to this approach is that the
    results of a computation aren't retained, and will be recomputed the next
    time they're needed.  However, in some cases you may have an array of
    intermediate results that were expensive to compute and can fit into memory
    - in this case, creating a materialized version of the array allows you to
    re-use those results without recomputing them every time:

      >>> array1 = # Expensive-to-compute array
      >>> array2 = materialize(array1)
      # Now, use array2 in place of array1, to avoid recomputing.
    """
    return remote_array(self.proxy.materialize(source.proxy._pyroUri))
  def project(self, source, *attributes):
    """Return an array with fewer attributes.

    Creates an array that contains a subset of a source array's attributes.
    Specify the attributes to be retained by passing one-or-more attribute
    indices / names as parameters to project().  Attributes may be specified in
    any order.

    Note that it is also possible to duplicate attributes with project(),
    although working with idenically-named attributes downstream can be
    confusing.

      >>> autos = load("../data/automobiles.csv", schema="csv-file", chunk_size=100)

      >>> scan(attributes(autos))
        {i} name, type
      * {0} Model, string
        {1} Origin, string
        {2} Year, string
        {3} Cylinders, string
        {4} Acceleration, string
        {5} Displacement, string
        {6} Horsepower, string
        {7} MPG, string

      >>> project(autos, "Year", "MPG")
      <406 element remote array with dimension: i and attributes: Year, MPG>

      >>> project(autos, 1, 3, 2)
      <406 element remote array with dimension: i and attributes: Origin, Cylinders, Year>
    """
    return remote_array(self.proxy.project(source.proxy._pyroUri, attributes))
  def random(self, shape, chunks=None, seed=12345, attributes="val"):
    """Return an array of random values.

    Creates an array with the given shape and chunk sizes, with one-or-more
    attributes containing samples drawn from a uniform distribution in the
    range [0, 1).

    The shape parameter must be an int or a sequence of ints that specify the
    size of the array along each dimension.  The chunks parameter must an int
    or sequence of ints that specify the maximum size of an array chunk along
    each dimension, and must match the number of dimensions implied by the
    shape parameter.  If the chunks parameter is None (the default), the chunk
    sizes will be identical to the array shape, i.e. the array will have a
    single chunk.  This may be impractical for large arrays and prevents the
    array from being distributed across multiple workers.  The seed parameter
    is used by the underlying random number generator and can be used to generate
    identical random arrays.

    The attributes parameter may be a string attribute name, a tuple containing
    attribute name and type, a sequence of attribute names, or a sequence of
    name/type tuples.


      >>> scan(attributes(random(4)))
        {i} name,type
      * {0} val,float64

      >>> scan(dimensions(random(4)))
        {i} name,type,begin,end,chunk-size
      * {0} d0,int64,0,4,4

      >>> scan(random(4))
        {d0} val
      * {0} 0.929616092817
        {1} 0.316375554582
        {2} 0.183918811677
        {3} 0.204560278553

      >>> scan(random(4, 2))
        {d0} val
      * {0} 0.929616092817
        {1} 0.316375554582
      * {2} 0.92899722191
        {3} 0.449165754101

      >>> scan(dimensions(random((4, 4), (2, 2))))
        {i} name,type,begin,end,chunk-size
      * {0} d0,int64,0,4,2
        {1} d1,int64,0,4,2

      >>> scan(random((4, 4), (2, 2)))
        {d0,d1} val
      * {0,0} 0.929616092817
        {0,1} 0.316375554582
        {1,0} 0.183918811677
        {1,1} 0.204560278553
      * {0,2} 0.92899722191
        {0,3} 0.449165754101
        {1,2} 0.228315321884
        {1,3} 0.707144041509
      * {2,0} 0.703148581097
        {2,1} 0.537772928495
        {3,0} 0.24899574575
        {3,1} 0.534471770025
      * {2,2} 0.370670417272
        {2,3} 0.602791780041
        {3,2} 0.229158970052
        {3,3} 0.486744328559
    """
    return remote_array(self.proxy.random(shape, chunks, seed, attributes))
  def redimension(self, source, dimensions, attributes):
    return remote_array(self.proxy.redimension(source.proxy._pyroUri, dimensions, attributes))

  def rename(self, source, attributes=[], dimensions=[]):
    """Copy a source array, with renamed attributes and dimensions.

    The caller specifies attributes and dimensions to be renamed by their
    string name or integer index.

    When specifying a single attribute or dimension to rename, pass a
    (name-or-index, new-name) tuple to the appropriate parameter.  To rename
    multiple attributes or dimensions, pass a list of (name-or-index, new-name)
    tuples or a dictionary containing {name-or-index:new-name, ...} items.  You
    may freely mix-and-match specifications to rename attributes and dimensions
    simultaneously, if you wish.

    Note that it is possible (though somewhat undesirable) for an array to
    contain attributes or dimensions with identical names.  In this case, you
    will want to use integer indices for renaming.

    Also note that it is not an error condition if none of the attributes or
    dimensions in the source array match the caller's specifications.  In this
    case, the new array simply contains all the same attributes and dimensions
    as the original.

      >>> a = random((5, 5), attributes=["a", "b", "c"])
      >>> a
      <5x5 remote array with dimensions: d0, d1 and attributes: a, b, c>

      >>> rename(a, dimensions=("d0", "i"), attributes=("c", "d"))
      <5x5 remote array with dimensions: i, d1 and attributes: a, b, d>

      >>> rename(a, dimensions={0:"i",1:"j"}, attributes={0:"d","c":"e"})
      <5x5 remote array with dimensions: i, j and attributes: d, b, e>
    """
    return remote_array(self.proxy.rename(source.proxy._pyroUri, attributes, dimensions))

  def scan(self, source, format="dcsv", separator=", ", stream=sys.stdout):
    """Format the contents of an array, writing them to a stream.

    Scanning an array is the easiest way to see its contents formatted for
    human-consumption.  Use the stream parameter to control where the formatted
    output is written, whether to stdout (the default), a file, or any other
    file-like object.

    The format parameter specifies how the array contents will be formatted - use
    format "csv" to write each array cell as a line containing comma-separated
    attribute values for that cell.  Note that cell coordinates and chunk
    boundaries are lost with this format:

      >>> scan(random((2, 2), (1, 2)), format="csv")
      val
      0.929616092817
      0.316375554582
      0.183918811677
      0.204560278553

    Use format "csv+" to write each array cell as a line containing
    comma-separated cell coordinates and attribute values for that cell:

      >>> scan(random((2, 2), (1, 2)), format="csv+")
      d0,d1,val
      0,0,0.929616092817
      0,1,0.316375554582
      1,0,0.183918811677
      1,1,0.204560278553

    Use format "dcsv" (the default) to write each array cell as a line with
    markers for chunk boundaries along with comma-separated cell coordinates
    and attribute values for that cell.  Cell coordinates are surrounded by
    braces making them easier to distinguish from attribute values:

      >>> scan(random((2, 2), (1, 2)), format="dcsv")
        {d0,d1} val
      * {0,0} 0.929616092817
        {0,1} 0.316375554582
      * {1,0} 0.92899722191
        {1,1} 0.449165754101

    Format "null" produces no written output, but is useful to force
    computation for timing studies without cluttering the screen or interfering
    with timing results:

    >>> scan(random((2, 2), (1, 2)), format="null")

    The separator parameter contains a string which is used as the separator
    between values.  It defaults to ", " to provide better legibility for
    humans, but could be set to "," to produce a more compact file, "\t" to
    create a tab-delimited file, etc.

    Note that scanning an array means sending all of its data to the client for
    formatting, which may be impractically slow or exceed available client
    memory for large arrays.
    """
    start_time = time.time()
    if format == "null":
      for chunk in source.chunks():
        for attribute in chunk.attributes():
          values = attribute.values()
    elif format == "csv":
      stream.write(separator.join([attribute["name"] for attribute in source.attributes]))
      stream.write("\n")
      for chunk in source.chunks():
        iterators = [attribute.values().flat for attribute in chunk.attributes()]
        try:
          while True:
            stream.write(separator.join([str(iterator.next()) for iterator in iterators]))
            stream.write("\n")
        except StopIteration:
          pass
    elif format == "csv+":
      stream.write(separator.join([dimension["name"] for dimension in source.dimensions] + [attribute["name"] for attribute in source.attributes]))
      stream.write("\n")
      for chunk in source.chunks():
        chunk_coordinates = chunk.coordinates()
        iterators = [numpy.ndenumerate(attribute.values()) for attribute in chunk.attributes()]
        try:
          while True:
            values = [iterator.next() for iterator in iterators]
            coordinates = chunk_coordinates + values[0][0]
            stream.write(separator.join([str(coordinate) for coordinate in coordinates] + [str(value[1]) for value in values]))
            stream.write("\n")
        except StopIteration:
          pass
    elif format == "dcsv":
      stream.write("  {%s} " % separator.join([dimension["name"] for dimension in source.dimensions]))
      stream.write(separator.join([attribute["name"] for attribute in source.attributes]))
      stream.write("\n")
      for chunk_index, chunk in enumerate(source.chunks()):
        chunk_coordinates = chunk.coordinates()
        iterators = [numpy.ndenumerate(attribute.values()) for attribute in chunk.attributes()]
        try:
          chunk_marker = "* "
          while True:
            values = [iterator.next() for iterator in iterators]
            coordinates = chunk_coordinates + values[0][0]
            stream.write(chunk_marker)
            stream.write("{%s} " % separator.join([str(coordinate) for coordinate in coordinates]))
            stream.write(separator.join([str(value[1]) for value in values]))
            stream.write("\n")
            chunk_marker = "  "
        except StopIteration:
          pass
    else:
      raise Exception("Allowed formats: {}".format(", ".join(["null", "csv", "csv+", "dcsv (default)"])))

    log.info("elapsed time: %s seconds" % (time.time() - start_time))

  def shutdown(self):
    """Request that the connected coordinator and all workers shut-down.

    Note that this is currently an experimental feature, which does not enforce
    any access controls.  Shutting down while other clients are working will
    make you very unpopular!
    """
    self.proxy.shutdown()

  def value(self, source, attributes=None):
    """Returns first values (values at the lowest-numbered set of coordinates) from array attributes.

    Attributes can be specified by-index or by-name, or any mixture of the two.

    If the attributes parameter is None (the default), value() will return the
    first value from every attribute in the array.  If the array only has one
    attribute, the value will be returned directly.  If the array has multiple
    attributes, their first values will be returned as a tuple.

    If the attributes parameter is a single integer or string, a single first
    value will be returned.

    If the attributes parameter is a sequence of integers / strings, a tuple of
    first values will be returned.

    Note that extracting first values from an array means moving attribute data
    to the client, which may be impractically slow or exceed available client
    memory for large arrays.

    The value() function is primarily of use when working with arrays that
    only have one cell to begin with, such as aggregation results.
    """
    def materialize_value(iterator, attribute, source_attributes):
      """Materializes the first value of an attribute."""
      # Convert attribute names into indices ...
      if isinstance(attribute, basestring):
        for index, source_attribute in enumerate(source_attributes):
          if source_attribute["name"] == attribute:
            attribute = index
            break
        else:
          raise InvalidArgument("Unknown attribute name: {}".format(attribute))
      elif isinstance(attribute, int):
        if attribute >= len(source_attributes):
          raise InvalidArgument("Attribute index out-of-bounds: {}".format(attribute))
      else:
        raise InvalidArgument("Attribute must be an integer index or a name: {}".format(attribute))

      return numpy.nditer(iterator.values(attribute)).next().item()

    iterator = source.proxy.iterator()
    source_attributes = source.attributes
    try:
      iterator.next()
      if attributes is None:
        if len(source_attributes) == 1:
          results = materialize_value(iterator, 0, source_attributes)
        else:
          results = tuple([materialize_value(iterator, attribute, source_attributes) for attribute in range(len(source_attributes))])
      elif isinstance(attributes, list) or isinstance(attributes, tuple):
        return tuple([materialize_value(iterator, attribute, source_attributes) for attribute in attributes])
      else:
        return materialize_value(iterator, attributes, source_attributes)
      iterator.release()
      return results
    except StopIteration:
      iterator.release()
    except:
      iterator.release()
      raise

  def values(self, source, attributes=None):
    """Convert array attributes into numpy arrays.

    Attributes can be specified by-index or by-name, or any mixture of the two.

    If the attributes parameter is None (the default), values() will return
    every attribute in the array.  If the array has a single attribute, it will
    be returned as a single numpy array.  If the array has multiple attributes,
    they will be returned as a tuple of numpy arrays.

    If the attributes parameter is a single integer or string, a single numpy
    array will be returned.

    If the attributes parameter is a sequence of integers / strings, a tuple of
    numpy arrays will be returned.

    Note that converting an attribute from an array means moving all the
    attribute data to the client, which may be impractically slow or exceed
    available client memory for large arrays.
    """
    def materialize_attribute(attribute, source_attributes):
      """Materializes one attribute into a numpy array."""
      # Convert attribute names into indices ...
      if isinstance(attribute, basestring):
        for index, source_attribute in enumerate(source_attributes):
          if source_attribute["name"] == attribute:
            attribute = index
            break
        else:
          raise InvalidArgument("Unknown attribute name: {}".format(attribute))
      elif isinstance(attribute, int):
        if attribute >= len(source_attributes):
          raise InvalidArgument("Attribute index out-of-bounds: {}".format(attribute))
      else:
        raise InvalidArgument("Attribute must be an integer index or a name: {}".format(attribute))

      # Materialize every chunk into memory ...
      chunk_coordinates = []
      chunk_values = []
      iterator = source.proxy.iterator()
      try:
        while True:
          iterator.next()
          chunk_coordinates.append(iterator.coordinates())
          chunk_values.append(iterator.values(attribute))
      except StopIteration:
        iterator.release()
      except:
        iterator.release()
        raise

      # Calculate a compatible dtype for the result array (this would be easy,
      # except we have to handle string arrays, where each chunk may contain
      # different fixed-width string dtypes).
      result_type = numpy.result_type(*[values.dtype for values in chunk_values])

      # Create the result array and populate it ...
      result = numpy.empty(source.shape, dtype=result_type)
      for coordinates, values in zip(chunk_coordinates, chunk_values):
        hyperslice = [slice(coordinate, coordinate + values.shape[index]) for index, coordinate in enumerate(coordinates)]
        result[hyperslice] = values
      return result

    start_time = time.time()

    source_attributes = source.attributes
    if attributes is None:
      if len(source_attributes) == 1:
        return materialize_attribute(0, source_attributes)
      else:
        return tuple([materialize_attribute(attribute, source_attributes) for attribute in range(len(source_attributes))])
    elif isinstance(attributes, list) or isinstance(attributes, tuple):
      return tuple([materialize_attribute(attribute, source_attributes) for attribute in attributes])
    else:
      return materialize_attribute(attributes, source_attributes)

    log.info("elapsed time: %s seconds" % (time.time() - start_time))
    return result

  def workers(self):
    """Return the current set of available slycat analysis workers."""
    for worker in self.nameserver.list(prefix="slycat.worker").keys():
      proxy = Pyro4.Proxy(self.nameserver.lookup(worker))
      proxy._pyroOneway.add("shutdown")
      yield proxy

  def zeros(self, shape, chunks=None, attributes="val"):
    """Return an array of all zeros.

    Creates an array with the given shape and chunk sizes, with one-or-more
    attributes filled with zeros.

    The shape parameter must be an int or a sequence of ints that specify the
    size of the array along each dimension.  The chunks parameter must an int
    or sequence of ints that specify the maximum size of an array chunk along
    each dimension, and must match the number of dimensions implied by the
    shape parameter.  If the chunks parameter is None (the default), the chunk
    sizes will be identical to the array shape, i.e. the array will have a
    single chunk.  This may be impractical for large arrays, and prevents the
    array from being distributed across multiple remote workers.

    The attributes parameter may be a string attribute name, a tuple containing
    attribute name and type, a sequence of attribute names, or a sequence of
    name/type tuples.

      >>> scan(attributes(zeros(4)))
        {i} name,type
      * {0} val,float64

      >>> scan(dimensions(zeros(4)))
        {i} name,type,begin,end,chunk-size
      * {0} d0,int64,0,4,4

      >>> scan(zeros(4))
        {d0} val
      * {0} 0.0
        {1} 0.0
        {2} 0.0
        {3} 0.0

      >>> scan(zeros(4, 2))
        {d0} val
      * {0} 0.0
        {1} 0.0
      * {2} 0.0
        {3} 0.0

      >>> scan(dimensions(zeros((4, 4), (2, 2))))
        {i} name,type,begin,end,chunk-size
      * {0} d0,int64,0,4,2
        {1} d1,int64,0,4,2

      >>> scan(zeros((4, 4), (2, 2)))
        {d0,d1} val
      * {0,0} 0.0
        {0,1} 0.0
        {1,0} 0.0
        {1,1} 0.0
      * {0,2} 0.0
        {0,3} 0.0
        {1,2} 0.0
        {1,3} 0.0
      * {2,0} 0.0
        {2,1} 0.0
        {3,0} 0.0
        {3,1} 0.0
      * {2,2} 0.0
        {2,3} 0.0
        {3,2} 0.0
        {3,3} 0.0
    """
    return remote_array(self.proxy.zeros(shape, chunks, attributes))

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
def join(array1, array2):
  return get_connection().join(array1, array2)
join.__doc__ = connection.join.__doc__
dimensions.__doc__ = connection.dimensions.__doc__
def load(path, schema="csv-file", **keywords):
  return get_connection().load(path, schema, **keywords)
load.__doc__ = connection.load.__doc__
def materialize(source):
  return get_connection().materialize(source)
materialize.__doc__ = connection.materialize.__doc__
def project(source, *attributes):
  return get_connection().project(source, *attributes)
project.__doc__ = connection.project.__doc__

def random(shape, chunks=None, seed=12345, attributes="val"):
  return get_connection().random(shape, chunks, seed, attributes)
random.__doc__ = connection.random.__doc__

def redimension(source, dimensions, attributes):
  return get_connection().redimension(source, dimensions, attributes)
redimension.__doc__ = connection.redimension.__doc__

def rename(source, attributes=[], dimensions=[]):
  return get_connection().rename(source, attributes, dimensions)
rename.__doc__ = connection.rename.__doc__

def scan(source, format="dcsv", separator=", ", stream=sys.stdout):
  return get_connection().scan(source, format, separator, stream)
scan.__doc__ = connection.scan.__doc__
def shutdown():
  return get_connection().shutdown()
shutdown.__doc__ = connection.shutdown.__doc__

def value(source, attributes=None):
  return get_connection().value(source, attributes)
value.__doc__ = connection.value.__doc__

def values(source, attributes=None):
  return get_connection().values(source, attributes)
values.__doc__ = connection.values.__doc__

def workers():
  return get_connection().workers()
workers.__doc__ = connection.workers.__doc__
def zeros(shape, chunks=None, attributes="val"):
  return get_connection().zeros(shape, chunks, attributes)
zeros.__doc__ = connection.zeros.__doc__
