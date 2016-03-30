#!/bin/env python

# Copyright 2016 Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000, there is a non-exclusive license for use of this work by
# or on behalf of the U.S. Government. Export of this program may require a
# license from the United States Government.

"""Stage data to hdf5 format for Slycat computation.
"""
import argparse
import concurrent.futures
import h5py
import logging
import multiprocessing
import numpy
import os
import os.path
import shutil
import slycat.hdf5
import threading
import csv
from urlparse import urlparse

def _isNumeric(j):
  try:
    x = float(j)
  except ValueError:
    return False
  return True

parser = argparse.ArgumentParser()
parser.add_argument("--output-directory", help="Output directory containing hdf5 files.")
parser.add_argument("--id-column", default=None, help="Inputs file id column name.")
parser.add_argument("--inputs-file", default=None, help="The name of the delimited text file containing input data.")
parser.add_argument("--inputs-file-delimiter", default=None, help="Field delimiter.  By default, fields will be delimited with any whitespace except a newline.")
parser.add_argument("--parallel-jobs", "-j", default=multiprocessing.cpu_count(), type=int, help="Number of parallel jobs to run.  Default: %(default)s")
parser.add_argument("--force", action="store_true", help="Overwrite existing data.")
arguments = parser.parse_args()

log_lock = threading.Lock()
log = logging.getLogger()
log.setLevel(logging.INFO)
log.addHandler(logging.StreamHandler())
log.handlers[0].setFormatter(logging.Formatter("%(levelname)s - %(message)s"))

if arguments.force:
  shutil.rmtree(arguments.output_directory, ignore_errors=True)
if os.path.exists(arguments.output_directory):
  raise Exception("Destination directory %s already exists.  Use --force to overwrite." % arguments.output_directory)
os.makedirs(arguments.output_directory)

if arguments.inputs_file is None:
  raise Exception("Inputs file is a required argument. Use --inputs-file to include inputs file.")
if not os.path.isfile(arguments.inputs_file):
  raise Exception("Inputs file could not be found. Check its path and verify permissions.")

# Convert inputs file
log.info("Converting %s", arguments.inputs_file)
with open(arguments.inputs_file, "r") as stream:
  rows = [row.split(arguments.inputs_file_delimiter) for row in stream]

column_names = [name.strip() for name in rows[0]]
column_types = ["string" for name in column_names]
rows = rows[1:] # removes first row (header)
row_count = len(rows)

columns = zip(*rows)   # this is the data only - no headers, now a list of tuples:  [(index1, index2, ...), (voltage1, voltage2, ...) ...]

if arguments.id_column is not None:
  if column_names[0] != arguments.id_column:
    raise Exception("The first column in %s must be %s, got %s instead." % (arguments.inputs_file, arguments.id_column, column_names[0]))
  columns[0] = numpy.array(columns[0], dtype="int64")  # repack the index col as numpy array
else:
  # if the ID column isn't specified, creates one and prepend it to the columns
  column_names = ["%eval_id"] + column_names
  columns = [numpy.array(range(0, row_count), dtype="int64")] + columns

column_types[0] = "int64"

for index in range(1, len(columns)):  # repack data cols as numpy arrays
  try:
    if _isNumeric(columns[index][0]):
      columns[index] = numpy.array(columns[index], dtype="float64")
      column_types[index] = "float64"
    else:
      stringType = "S" + str(len(columns[index][0]))  # using length of first string for whole column
      columns[index] = numpy.array(columns[index], dtype=stringType)
      column_types[index] = "string"
  except:
    pass

dimensions = [dict(name="row", end=row_count)]
attributes = [dict(name=name, type=type) for name, type in zip(column_names, column_types)]

# write the inputs file data out to "inputs.hdf5" file
with h5py.File(os.path.join(arguments.output_directory, "inputs.hdf5"), "w") as file:
  arrayset = slycat.hdf5.start_arrayset(file)
  array = arrayset.start_array(0, dimensions, attributes)
  for attribute, column in enumerate(columns):
    array.set_data(attribute, slice(0, column.shape[0]), column)

def process_timeseries(timeseries_path, timeseries_name, timeseries_index, eval_id):
  t_add_index_column = None
  t_column_names = None
  t_column_types = None
  t_delimiter = None

  url = urlparse(timeseries_path)
  path = url.path # strips scheme and network location from timeseries_path

  try:
    with log_lock:
      log.info("Reading %s", path)

    with open("%s" % path, "r") as stream:
      line = stream.readline()
      # detects delimiter
      sniffer = csv.Sniffer()
      dialect = sniffer.sniff(line)
      t_delimiter = dialect.delimiter

      t_column_names = [name.strip() for name in line.split(t_delimiter)]
      t_first_row = [val.strip() for val in stream.readline().split(t_delimiter)]

      if isinstance(t_first_row[0], int):
        t_add_index_column = True
        t_column_names = ["Index"] + t_column_names
      else:
        t_column_names[0] = "Index"

      t_column_types = ["float64" for name in t_column_names]
      t_column_names[1] = "TIME"

    data = numpy.loadtxt("%s" % path, comments="End", skiprows=1, delimiter=t_delimiter)
    if t_add_index_column is True:
      data = numpy.insert(data, 0, range(len(data)), axis=1)

    timeseries_dir = os.path.join(arguments.output_directory, timeseries_name)
    if not os.path.exists(timeseries_dir):
      os.makedirs(timeseries_dir)

    hdf5_path = os.path.join(timeseries_dir, "timeseries-%s.hdf5" % timeseries_index)
    with log_lock:
      log.info("Writing %s", hdf5_path)
    with h5py.File(hdf5_path, "w") as file:
      arrayset = slycat.hdf5.start_arrayset(file)
      dimensions = [dict(name="row", end=data.shape[0])]
      attributes = [dict(name=name, type=type) for name, type in zip(t_column_names, t_column_types)[1:]] # leaves out the index column
      array = arrayset.start_array(0, dimensions, attributes)
      for attribute, column in enumerate(data.T[1:]):
        array.set_data(attribute, slice(0, column.shape[0]), column)
  except IOError, err:
    log.error("Failed reading %s: %s", path, err)
  except:
    log.error("Unexpected error reading %s", path)

def convert_timeseries(timeseries_index, eval_id, row):
  for i, val in enumerate(row):
    if column_types[i] is "string":
      file_ext = val[len(val) - 3:]
      if file_ext == "csv" or file_ext == "dat" or file_ext == "txt":
        process_timeseries(val, column_names[i], timeseries_index, eval_id)

with concurrent.futures.ProcessPoolExecutor(arguments.parallel_jobs) as pool:
  results = list(pool.map(convert_timeseries, range(row_count), columns[0], rows))
