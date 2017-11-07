#!/bin/env python

# Copyright 2013 Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000, there is a non-exclusive license for use of this work by
# or on behalf of the U.S. Government. Export of this program may require a
# license from the United States Government.

"""
Compute a timeseries model data from hdf5 data, saving to files for the Slycat
Web Server to ingest.

This script loads data from a directory containing:
  One inputs.hdf5 file containing a single table.
  One timeseries-N.hdf5 file for each row in the input table.
"""
import argparse
import os

try:
    import cpickle as pickle
except:
    import pickle

parser = argparse.ArgumentParser()
parser.add_argument("--number", type=int, default=1,
                    help="Name of the timeseries, i.e. sub-directory name in the input directory.")
arguments = parser.parse_args()

print "the argument number was: %s" % arguments.number
