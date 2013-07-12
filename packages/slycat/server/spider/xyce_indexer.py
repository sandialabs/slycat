# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def index(**keywords):
  path = keywords["path"]
  content = keywords["content"]
  progress = keywords["progress"]

  progress.write("Indexing XYCE data.")

  try:
    import io
    import sys

    from . import time_series

    if path is not None:
      stream = io.open(path, "rt", encoding="ascii", errors="strict", newline=None)
    if content is not None:
      stream = io.TextIOWrapper(io.BytesIO(content), encoding="ascii", errors="strict", newline=None)
    line_limit = 2**18

    # Scan through the file, keeping-track of the number of rows and a set of
    # candiate field delimiters ...
    first_row = stream.readline(line_limit)
    if len(first_row) == line_limit:
      raise Exception("Row length exceeded.")
    if first_row == "":
      raise Exception("Empty file.")

    field_counts = dict([(delimiter, len(first_row.split(delimiter))) for delimiter in [None, "\t", ","]])

    timestep_count = 0
    while True:
      row = stream.readline(line_limit)
      if len(row) == line_limit:
        raise Exception("Row length exceeded.")
      if row == "":
        break
      if row.strip() == "End of Xyce(TM) Simulation":
        break
      timestep_count += 1

      # Get rid of any delimiter that doesn't produce a consistent number of
      # fields throughout the file ...
      for delimiter in field_counts.keys():
        if len(row.split(delimiter)) != field_counts[delimiter]:
          del field_counts[delimiter]

      # If there aren't any delimiters left, this isn't a XYCE file ...
      if len(field_counts) == 0:
        raise Exception("No field delimiters detected.")

    # Pick whichever remaining delimiter produces the largest number of fields ...
    delimiter = sorted(field_counts.items(), key=lambda x: x[1], reverse=True)[0][0]

    # Gather information about "special" series ...
    series_names = [name.strip() for name in first_row.split(delimiter)]
    index_index = series_names.index("Index") if "Index" in series_names else None
    time_index = series_names.index("TIME") if "TIME" in series_names else None
    if time_index is None:
      raise Exception("File doesn't contain time.")

    # Get the range of available times, and see whether the simulation completed ...
    first_time = None
    last_time = None
    completed = False
    stream.seek(0, 0)
    stream.readline()
    for row in stream:
      if row.strip() == "End of Xyce(TM) Simulation":
        completed = True
        break
      values = row.split(delimiter)
      if first_time is None:
        first_time = float(values[time_index])
      last_time = float(values[time_index])


    # Setup a table accumulator, and scan through the file a second time to
    # produce a table perspective ...
    series_names = [series_names[i] for i in range(len(series_names)) if i != index_index and i != time_index]
    accumulator = time_series.perspective_accumulator(timestep_count, first_time, last_time, series_names)
    stream.seek(0, 0)
    stream.readline()
    for row in stream:
      if row.strip() == "End of Xyce(TM) Simulation":
        break
      values = row.split(delimiter)
      accumulator.add_values(float(values[time_index]), [values[i] for i in range(len(values)) if i != index_index and i != time_index])
    perspective =  accumulator.perspective()

    if not completed:
      perspective["incomplete-results"] = True

    yield perspective

  except:
    import traceback
    progress.write(traceback.format_exc(), 1)
