#!/bin/env python

# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

"""
test script
"""
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--number", type=int, default=1,
                    help="number to be printed")
arguments = parser.parse_args()

print "the argument number was: %s" % arguments.number
