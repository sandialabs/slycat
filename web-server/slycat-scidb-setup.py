# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import slycat.web.server.database.scidb
import optparse
import sys

parser = optparse.OptionParser()
parser.add_option("--delete", default=False, action="store_true", help="Delete existing database.")
options, arguments = parser.parse_args()

database = slycat.web.server.database.scidb.connect()

if options.delete:
  with database.query("aql", "select name from list('arrays')") as results:
    for attribute in results:
      for value in attribute:
        database.execute("aql", "drop array %s" % value.getString())

