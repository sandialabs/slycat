# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import sys

def convert_table(path, content, encoding, progress, nan_row_filtering):
  import io

  from . import blocks
  from . import table

  if path is not None:
    stream = io.open(path, "rt", encoding=encoding, errors="strict", newline=None)
  if content is not None:
    stream = io.TextIOWrapper(io.BytesIO(content), encoding=encoding, errors="strict", newline=None)
  line_limit = 2**18

  # Scan through the file, keeping-track of the number of rows and a set of
  # candiate field delimiters ...
  first_row = stream.readline(line_limit)
  if len(first_row) == line_limit:
    raise Exception("Row length exceeded.")
  if first_row == "":
    raise Exception("Empty file.")

  field_counts = dict([(delimiter, len(first_row.split(delimiter))) for delimiter in [None, "\t", ","]])

  row_count = 0
  while True:
    row = stream.readline(line_limit)
    if len(row) == line_limit:
      raise Exception("Row length exceeded.")
    if row == "":
      break
    if len(row.strip()) == 0: # Skip empty rows ...
      continue
    row_count += 1

    # Get rid of any delimiter that doesn't produce a consistent number of
    # fields throughout the file ...
    for delimiter in field_counts.keys():
      if len(row.split(delimiter)) != field_counts[delimiter]:
        del field_counts[delimiter]

    # If there aren't any delimiters left, this isn't a delimited text file ...
    if len(field_counts) == 0:
      raise Exception("No field delimiters detected.")

  # Pick whichever remaining delimiter produces the largest number of fields ...
  delimiter = sorted(field_counts.items(), key=lambda x: x[1], reverse=True)[0][0]

  # Setup a table accumulator, and scan through the file a second time to
  # produce a table perspective ...
  column_names = [name.strip() for name in first_row.split(delimiter)]
  accumulator = table.data_accumulator(row_count, column_names, nan_row_filtering)
  stream.seek(0, 0)
  stream.readline()
  for row in stream:
    if len(row.strip()) == 0: # Skip empty rows ...
      continue
    accumulator.add_fields(row.split(delimiter))
  return accumulator.data()

def extract(**keywords):
  path = keywords["path"]
  content = keywords["content"]
  progress = keywords["progress"]
  nan_row_filtering = keywords["nan_row_filtering"]

  progress.write("Extracting path: %s" % path)

  for encoding in ["utf8", "ascii"]:
    try:
      yield convert_table(path, content, encoding, progress, nan_row_filtering)
      return # For the time being, limit ourselves to a single data object
    except:
      #import traceback
      #traceback.print_exc()
      pass
