# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import numpy
import slycat.darray

def parse(data):
  """Parse a delimited text file and return a 1D :py:mod:`darray<slycat.darray>` with an attribute for each table column.

  The input file must be formatted as follows:

  * Rows must be separated or terminated by CR, LF, or CR + LF.  The delimiter choice must be consistent throughout the file.
  * A single header row containing column names is required.
  * Fields must be separated by a comma or a tab.  The delimiter choice must be consistent throughout the file.
  * Each column will be converted to a floating-point type if possible.  Otherwise, it will be treated as a string type.
  * Empty fields are allowed, but columns containing empty fields cannot be converted to floating-point.
  * Numeric columns may contain "nan" fields.  Capitalization of nan fields is ignored, so "nan", "Nan", "NaN", "NAN", etc. are all allowed.

  Arguments
  ---------
  data : string
    The complete contents of the file to be parsed.

  Returns
  -------
  darray : :class:`slycat.darray.MemArray`
    In-memory representation of the table.
  """
  # Identify a row delimiter for the file.
  delimiter_counts = [(data.count(delimiter), delimiter) for delimiter in ["\r\n", "\r", "\n"]]
  delimiter_counts = [(count, delimiter) for count, delimiter in delimiter_counts if count != 0]
  if len(delimiter_counts) == 0:
    raise ValueError("Delimited text file must contain CR, LF, or CRLF row delimiters.")
  row_delimiter = delimiter_counts[0][1]

  # Split data into rows
  rows = [row for row in data.split(row_delimiter) if len(row)]

  # Identify a column delimiter for the file.
  delimiter_counts = [(numpy.array([len(row.split(delimiter)) for row in rows]), delimiter) for delimiter in [",", "\t"]]
  delimiter_counts = [(counts[0], delimiter) for counts, delimiter in delimiter_counts if counts.var() == 0 and counts[0] > 1]
  if len(delimiter_counts) == 0:
    raise ValueError("Delimited text file must contain consistent comma or tab field delimiters.")
  field_delimiter = sorted(delimiter_counts)[-1][1]

  # Split data into fields.
  rows = [row.split(field_delimiter) for row in rows]

  # Convert to column-oriented data.
  columns = zip(*rows)

  # Generate final outputs.
  dimensions = [{"name":"row", "type":"int64", "begin":0, "end":len(rows[1:])}]
  attributes = []
  data = []
  for column in columns:
    try:
      data.append(numpy.array(column[1:]).astype("float64"))
      attributes.append({"name":column[0], "type":"float64"})
    except:
      data.append(numpy.array(column[1:]))
      attributes.append({"name":column[0], "type":"string"})

  return slycat.darray.MemArray(dimensions, attributes, data)
