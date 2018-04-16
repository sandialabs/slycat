#!/bin/env python
# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

# Convert CSV files into HDF5 files for ingestion into timeseries model.
# To be used in conjuction with the hdf5-to-timeseries-model script.

# arguments:
# id field - required, used to group rows into distinct timeseries
# time field - required, contains the timestamp for each timeseries observation
# output fields - required, one-to-many output fields for each timestamp
# input fields - optional, zero-to-many input fields for each timestamp, containing params used in timeseries generation
# output path - required, output directory for hdf5 results

# From the CSV - generates the following in *path*
# 1 inputs.hdf5 file containing just the values from the input columns
# N timeseries-N.hdf5 files, one for each unique timeseries "id"

import os
import sys
import csv
import numpy
import time
import re
import h5py
import slycat.web.client
import slycat.hdf5

parser = slycat.web.client.ArgumentParser()
parser.add_argument("file", default="-", help="Input CSV file.  Use - for stdin.  Default: %(default)s")
parser.add_argument("--file-delimiter", default=",", help="Delimeter for the input file")
parser.add_argument("--id-field", default="id", help="Field used to represent the id of a series")
parser.add_argument("--time-field", default="Time", help="Field used to represent time")
parser.add_argument("--inputs", default=None, nargs="+", help="Input column(s).")
parser.add_argument("--outputs", default=[], nargs="+", help="Output column(s).")
parser.add_argument("--output-path", default="./csv_to_hdf5_%s" % time.time(), help="Field used to represent time")
arguments = parser.parse_args()

# create output dir if doens't exist
if not os.path.exists(arguments.output_path):
  os.mkdir(arguments.output_path)
  
# default to the ID field for our inputs output
arguments.inputs = arguments.inputs or [arguments.id_field] 

# check to see if the #time_field is in the outputs and that it is the first one, if not, add it
if len(arguments.outputs) or arguments.outputs[0] != arguments.time_field:
  arguments.outputs = [arguments.time_field] + arguments.outputs

def generate_hdf5_file(data, attrs, filename):
  dimensions = [{"name": "row", "end": data.shape[1]}]
  attributes = [{"name": attr, "type": "float64"} for attr in attrs]

  with h5py.File(os.path.join(arguments.output_path, filename)) as file:
    array_set = slycat.hdf5.start_arrayset(file)
    array = array_set.start_array(0, dimensions, attributes)
    for i, d in enumerate(data):
      array.set_data(i, slice(0, d.shape[0]), d)

######################
# Read in CSV        #
######################
# collect our row data in one place, otherwise to read the file over and over would require opening again and again
with open(arguments.file, 'rb') as csvfile:
  reader = csv.DictReader(csvfile, delimiter=arguments.file_delimiter)
  rows = [row for row in reader]

# figure out the uniq set of our ids so we can group our outputs for later processing
all_ids = map(lambda r:r[arguments.id_field], rows)
ids = set(all_ids)

######################
# inputs.hdf5        #  
######################
first_input_ids = [all_ids.index(id) for id in ids]
input_rows = [rows[id] for id in first_input_ids]
#inputs = numpy.array([[row[k] for k in arguments.inputs] for row in rows], dtype="float64").T
inputs = numpy.array([[row[k] for k in arguments.inputs] for row in input_rows], dtype="float64").T
generate_hdf5_file(inputs, arguments.inputs, "inputs.hdf5")

######################
# timeseries-N.hdf5  #
######################
# group into an outputs dict by each of our ids and transpose for direct write to hdf5
outputs = {i: numpy.array([[row[k] for k in arguments.outputs] for row in rows if row[arguments.id_field] == i], dtype="float64").T for i in ids}

# generate a timeseries-<i>.hdf5 file for each group of outputs by id field
for i, outs in outputs.iteritems():
  generate_hdf5_file(outs, arguments.outputs, "timeseries-%s.hdf5" % i)

# Examples of usage:
# python slycat-csv-timeseries-to-hdf5.py <path to csv file> --outputs 'out1' 'out2' 'outN'
# python slycat-csv-timeseries-to-hdf5.py <path to csv file> --outputs 'out1' 'out2' 'outN' --output-path 'path for output'
# python slycat-csv-timeseries-to-hdf5.py <path to csv file> --id-field 'some-id' --outputs 'out1' 'out2' 'outN'
# python slycat-csv-timeseries-to-hdf5.py <path to csv file> --id-field 'some-id' --inputs 'in1' 'in2' --outputs 'out1' 'out2' 'outN'
