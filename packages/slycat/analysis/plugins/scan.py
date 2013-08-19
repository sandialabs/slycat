# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

from slycat.analysis.plugin.client import log
import numpy
import sys
import time

def scan(connection, source, format="dcsv", null_marker="--", separator=", ", stream=sys.stdout):
  """Format the contents of an array, writing them to a stream.

  Signature: scan(source, format="dcsv", null_marker="--", separator=", ", stream=sys.stdout)

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

  Use format "kv" to write each attribute of each array cell to a separate line
  in the output as a key-value pair.  This is particularly useful when
  displaying results from operators that produce a single output cell, such as
  aggregate(), and when attribute names and values don't align well:

    >>> scan(aggregate(random((10, 10), attributes=["a", "b"]), ["min", "avg", "max"]))
      {i} min_a, min_b, avg_a, avg_b, max_a, max_b
    * {0} 0.00838829794155, 0.000107256519737, 0.554804081192, 0.499030432518, 0.9940145859, 0.995316174593

    >>> scan(aggregate(random((10, 10), attributes=["a", "b"]), ["min", "avg", "max"]), format="kv")
    * {i} = {0}
      min_a = 0.00838829794155
      min_b = 0.000107256519737
      avg_a = 0.554804081192
      avg_b = 0.499030432518
      max_a = 0.9940145859
      max_b = 0.995316174593

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
      chunk_coordinates = numpy.ndindex(*chunk.shape())
      chunk_values = [attribute.values() for attribute in chunk.attributes()]
      for local_coordinates in chunk_coordinates:
        stream.write(separator.join([null_marker if values.mask[local_coordinates] else str(values[local_coordinates]) for values in chunk_values]))
        stream.write("\n")
  elif format == "csv+":
    stream.write(separator.join([dimension["name"] for dimension in source.dimensions] + [attribute["name"] for attribute in source.attributes]))
    stream.write("\n")
    for chunk in source.chunks():
      chunk_offset = chunk.coordinates()
      chunk_coordinates = numpy.ndindex(*chunk.shape())
      chunk_values = [attribute.values() for attribute in chunk.attributes()]
      for local_coordinates in chunk_coordinates:
        global_coordinates = chunk_offset + local_coordinates
        stream.write(separator.join([str(coordinate) for coordinate in global_coordinates] + [null_marker if values.mask[local_coordinates] else str(values[local_coordinates]) for values in chunk_values]))
        stream.write("\n")
  elif format == "dcsv":
    stream.write("  {%s} " % separator.join([dimension["name"] for dimension in source.dimensions]))
    stream.write(separator.join([attribute["name"] for attribute in source.attributes]))
    stream.write("\n")
    for chunk in source.chunks():
      chunk_offset = chunk.coordinates()
      chunk_coordinates = numpy.ndindex(*chunk.shape())
      chunk_values = [attribute.values() for attribute in chunk.attributes()]
      chunk_marker = "* "
      for local_coordinates in chunk_coordinates:
        global_coordinates = chunk_offset + local_coordinates
        stream.write(chunk_marker)
        stream.write("{%s} " % separator.join([str(coordinate) for coordinate in global_coordinates]))
        stream.write(separator.join([null_marker if values.mask[local_coordinates] else str(values[local_coordinates]) for values in chunk_values]))
        stream.write("\n")
        chunk_marker = "  "
  elif format == "kv":
    attributes = source.attributes
    for chunk in source.chunks():
      chunk_offset = chunk.coordinates()
      chunk_coordinates = numpy.ndindex(*chunk.shape())
      chunk_values = [attribute.values() for attribute in chunk.attributes()]
      chunk_marker = "* "
      for local_coordinates in chunk_coordinates:
        global_coordinates = chunk_offset + local_coordinates
        stream.write(chunk_marker)
        stream.write("{%s} = " % separator.join([dimension["name"] for dimension in source.dimensions]))
        stream.write("{%s}\n" % separator.join([str(coordinate) for coordinate in global_coordinates]))
        for attribute, values in zip(attributes, chunk_values):
          stream.write("    %s = " % attribute["name"])
          stream.write(null_marker if values.mask[local_coordinates] else str(values[local_coordinates]))
          stream.write("\n")
        chunk_marker = "  "
  else:
    raise Exception("Allowed formats: {}".format(", ".join(["null", "csv", "csv+", "dcsv (default)"])))

  log.info("elapsed time: %s seconds" % (time.time() - start_time))

def register_client_plugin(context):
  context.register_plugin_function("scan", scan)
