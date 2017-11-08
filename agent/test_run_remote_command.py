#!/bin/env python

# Copyright 2013 Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000, there is a non-exclusive license for use of this work by
# or on behalf of the U.S. Government. Export of this program may require a
# license from the United States Government.

"""
test script
"""
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--number", type=int, default=1,
                    help="number to be printed")
arguments = parser.parse_args()

print "the argument number was: %s" % arguments.number
