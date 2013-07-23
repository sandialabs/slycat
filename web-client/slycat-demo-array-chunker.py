# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import slycat.web.client
import getpass
import json
import optparse
import sys

def print_chunk(chunk):
  """Formats the data from a chunk request as an on-screen table."""
  for row in zip(*chunk["data"]):
    for field in row:
      sys.stderr.write("{:<5}".format(field))
    sys.stderr.write("\n")

parser = slycat.web.client.option_parser()
options, arguments = parser.parse_args()

connection = slycat.web.client.connect(options)

wid = connection.request("POST", "/workers", headers={"content-type":"application/json"}, data=json.dumps({"type":"array-chunker","shape":[4, 4]}))["id"]
sys.stderr.write("%s\n" % connection.request("GET", "/workers/%s/array-chunker/metadata" % (wid)))
sys.stderr.write("%s\n" % connection.request("GET", "/workers/%s/array-chunker/chunk?attributes=0&ranges=0,2,0,2" % (wid)))
connection.delete_worker(wid, stop=True)
