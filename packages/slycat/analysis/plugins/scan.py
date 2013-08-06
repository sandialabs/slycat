# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

from slycat.analysis.client import log
import numpy
import sys
import time

def scan(connection, source, format="dcsv", separator=", ", stream=sys.stdout):
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

def register_client_plugin(context):
  context.add_operator("scan", scan)
