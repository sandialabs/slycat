# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def index(**keywords):
  try:
    path = keywords["path"]
    content = keywords["content"]
    progress = keywords["progress"]

    if path is None:
      raise Exception("path must be specified for Exodus indexing")

    from . import time_series

    import ctypes
    import sys

    try:
      exodus = ctypes.cdll.LoadLibrary("libexoIIv2c.so")
    except:
      exodus = ctypes.cdll.LoadLibrary("libexoIIv2c.dylib")

    progress.write("Indexing ExodusII data.")

    cpu_float = ctypes.c_int(8)
    file_float = ctypes.c_int(0)
    file_version = ctypes.c_float(0)
    exoid = exodus.ex_open_int(str(path), ctypes.c_int(0), ctypes.byref(cpu_float), ctypes.byref(file_float), ctypes.byref(file_version), ctypes.c_int(514))
    if exoid == -1:
      raise Exception("Not an exodus file: %s" % path)

    timestep_count = ctypes.c_int(0)
    exodus.ex_inquire(exoid, ctypes.c_int(16), ctypes.byref(timestep_count), ctypes.byref(ctypes.c_float()), ctypes.byref(ctypes.c_char()));
    timestep_count = timestep_count.value

    first_time = ctypes.c_double(0)
    exodus.ex_get_time(exoid, ctypes.c_int(1), ctypes.byref(first_time))
    first_time = first_time.value

    last_time = ctypes.c_double(0)
    exodus.ex_get_time(exoid, ctypes.c_int(timestep_count), ctypes.byref(last_time))
    last_time = last_time.value

    series_count = ctypes.c_int(0)
    exodus.ex_get_var_param(exoid, "g", ctypes.byref(series_count))
    series_count = series_count.value

    series_names = (ctypes.c_char_p * series_count)()
    for i in range(series_count):
      series_names[i] = ctypes.create_string_buffer(33).raw
    exodus.ex_get_var_names(exoid, "g", series_count, ctypes.byref(series_names))
#    series_names = ["time"] + [name for name in series_names]
    series_names = [name for name in series_names]

#    accumulator = table.perspective_accumulator(timestep_count, series_names)
    accumulator = time_series.perspective_accumulator(timestep_count, first_time, last_time, series_names)
    for timestep in range(timestep_count):
      time = ctypes.c_double(0)
      exodus.ex_get_time(exoid, ctypes.c_int(timestep + 1), ctypes.byref(time))
      time = time.value

      values = (ctypes.c_double * series_count)()
      exodus.ex_get_glob_vars(exoid, ctypes.c_int(timestep + 1), ctypes.c_int(series_count), ctypes.byref(values))
#      values = [time] + [field for field in values]
      values = [field for field in values]

      accumulator.add_values(time, values)

    exodus.ex_close(exoid)

    yield accumulator.perspective()

  except:
    import traceback
    progress.write(traceback.format_exc(), 1)

