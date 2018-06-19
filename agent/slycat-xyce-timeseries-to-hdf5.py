#!/bin/env python

# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

"""Stage data to hdf5 format for Slycat computation.

This script loads data from a directory containing:

    One dakota_tabular.dat file.
    Multiple workdirN/circuit.cir.prn files, one for each row in dakota_tabular.dat.

... and transforms the data into hdf5 format for later computation / ingestion.
"""
import argparse
import concurrent.futures
import h5py
import logging
import multiprocessing
import numpy
import os
import shutil
import slycat.hdf5
import threading

def _isNumeric(j):
  try:
    x = float(j)
  except ValueError:
    return False
  return True

parser = argparse.ArgumentParser()
parser.add_argument("--input_directory", help="Input directory containing XYCE data (a dakota_tabular.dat file and multiple workdirN/*.prn files).")
parser.add_argument("--output_directory", help="Output directory containing hdf5 files.")
parser.add_argument("--id-column", default="%eval_id", help="Inputs file id column name.  Default: %(default)s")
parser.add_argument("--inputs-file", default=None, help="The name of the delimited text file containing input data.  By default, dakota_tabular.dat will be loaded from the input directory.")
parser.add_argument("--inputs-file-delimiter", default=None, help="Field delimiter.  By default, fields will be delimited with any whitespace except a newline.")
parser.add_argument("--parallel-jobs", "-j", default=multiprocessing.cpu_count(), type=int, help="Number of parallel jobs to run.  Default: %(default)s")
parser.add_argument("--timeseries-file", default="circuit.cir.prn", help="The name of the .prn file to load from each workdirN directory.  Default: %(default)s")
parser.add_argument("--start", default=None, help="First time in data to ingest. Default is to ingest entire signal.")
parser.add_argument("--end", default=None, help="Last time in data to ingest. Default is to ingest entire signal.")
parser.add_argument("--force", action="store_true", help="Overwrite existing data.")
parser.add_argument("--log_file", default=None, help="log file path")
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

if arguments.start and arguments.end and float(arguments.end) < float(arguments.start):
  log.error("Given end time is prior to given start time!  end: %s, start: %s", arguments.end, arguments.start)
  raise Exception("Please correct time span")

if arguments.start and arguments.end and float(arguments.end) == float(arguments.start):
  log.error("Given end time is the same as the given start time!  end: %s, start: %s", arguments.end, arguments.start)
  raise Exception("Please correct time span")

if arguments.inputs_file is None:
  arguments.inputs_file = os.path.join(arguments.input_directory, "dakota_tabular.dat")
  
# Convert dakota_tabular.dat
log.info("Converting %s", arguments.inputs_file)
with open(arguments.inputs_file, "r") as stream:
  rows = [row.split(arguments.inputs_file_delimiter) for row in stream]

column_names = [name.strip() for name in rows[0]]
column_types = ["string" for name in column_names]
rows = rows[1:]                                     #rows is now a list of lists
row_count = len(rows)

if column_names[0] != arguments.id_column:
  raise Exception("The first column in %s must be %s, got %s instead." % (arguments.inputs_file, arguments.id_column, column_names[0]))

columns = zip(*rows)   #this is the data only - no headers, now a list of tuples:  [(index1, index2, ...), (voltage1, voltage2, ...) ...]

columns[0] = numpy.array(columns[0], dtype="int64")  #repack the index col as numpy array
column_types[0] = "int64"

for index in range(1, len(columns)):  #repack data cols as numpy arrays
  try:
    if _isNumeric(columns[index][0]):
      columns[index] = numpy.array(columns[index], dtype="float64")
      column_types[index] = "float64"
    else:
      stringType = "S" + str(len(columns[index][0]))  #using length of first string for whole column
      columns[index] = numpy.array(columns[index], dtype=stringType)
      column_types[index] = "string"
  except:
    pass

dimensions = [dict(name="row", end=row_count)]
attributes = [dict(name=name, type=type) for name, type in zip(column_names, column_types)]

# write the dakota_tabular data out to "inputs.hdf5" file
with h5py.File(os.path.join(arguments.output_directory, "inputs.hdf5"), "w") as file:
  arrayset = slycat.hdf5.start_arrayset(file)
  array = arrayset.start_array(0, dimensions, attributes)
  for attribute, column in enumerate(columns):
    array.set_data(attribute, slice(0, column.shape[0]), column)

# Convert each prn timeseries.
def convert_timeseries(timeseries_index, eval_id):
  timeseries_path = os.path.join(arguments.input_directory, "workdir.%s" % eval_id, arguments.timeseries_file)
  with log_lock:
    log.info("Reading %s", timeseries_path)
  with open(timeseries_path, "r") as stream:
    column_names = [name.strip() for name in stream.readline().split()]
    if column_names[0] != "Index":
      raise Exception("First column in %s must be 'Index'" % timeseries_path)
    if column_names[1] != "TIME":
      raise Exception("Second column in %s must be 'TIME'" % timeseries_path)
    column_types = ["float64" for name in column_names]
  data = numpy.loadtxt(timeseries_path, comments="End", skiprows=1)

  if arguments.start is not None:
    if float(arguments.start) > float(data[-1][1]):
      log.warning("Start time is past final data time - no data modification.  start: %s, final: %s", arguments.start, data[-1][1])
    else:
      startIndex = 0
      for ii in range(data.shape[0]):
        if float(data[ii][1]) >= float(arguments.start):
          startIndex = ii
          break
      discard, data = numpy.array_split(data, numpy.array([startIndex]))

  if arguments.end is not None:
    if float(arguments.end) < float(data[0][1]):
      log.warning("End time is prior to first data time - no data modification.  end: %s, first: %s", arguments.end, data[0][1])
    else:
      endIndex = 0
      lastRow  = data.shape[0] - 1
      for ii in range(data.shape[0]):
        if float(data[ii][1]) > float(arguments.end):
          endIndex = ii
          break
      if endIndex == 0:
        endIndex = lastRow  # this sim ended prematurely
      data, discard = numpy.array_split(data, numpy.array([endIndex]))

  hdf5_path = os.path.join(arguments.output_directory, "timeseries-%s.hdf5" % timeseries_index)
  with log_lock:
    log.info("Writing %s", hdf5_path)
  with h5py.File(hdf5_path, "w") as file:
    arrayset = slycat.hdf5.start_arrayset(file)
    dimensions = [dict(name="row", end=data.shape[0])]
    attributes = [dict(name=name, type=type) for name, type in zip(column_names, column_types)[1:]] # Leave out the Index column
    array = arrayset.start_array(0, dimensions, attributes)
    for attribute, column in enumerate(data.T[1:]):
      array.set_data(attribute, slice(0, column.shape[0]), column)

with concurrent.futures.ProcessPoolExecutor(arguments.parallel_jobs) as pool:
  results = list(pool.map(convert_timeseries, range(row_count), columns[0]))
