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

connection = slycat.web.client.connection(auth=(options.user, getpass.getpass("%s password: " % options.user)), host=options.host, proxies={"http":options.http_proxy, "https":options.https_proxy}, verify=not options.no_verify)

wid = connection.request("POST", "/workers", headers={"content-type":"application/json"}, data=json.dumps({"type":"table-chunker","row-count":100,"column-count":10,"generate-index":"Index"}))["id"]
sys.stderr.write("%s\n" % connection.request("GET", "/workers/%s/table-chunker/metadata" % (wid)))
print_chunk(connection.request("GET", "/workers/%s/table-chunker/chunk?rows=0-12&columns=0-3" % (wid)))
connection.request("PUT", "/workers/%s/table-chunker/sort" % (wid), headers={"content-type":"application/json"}, data=json.dumps({"order":[[0,"ascending"]]}))
print_chunk(connection.request("GET", "/workers/%s/table-chunker/chunk?rows=0-12&columns=0-3" % (wid)))
connection.request("PUT", "/workers/%s/table-chunker/sort" % (wid), headers={"content-type":"application/json"}, data=json.dumps({"order":[[0,"ascending"],[1,"ascending"]]}))
print_chunk(connection.request("GET", "/workers/%s/table-chunker/chunk?rows=0-12&columns=0-3" % (wid)))
connection.request("PUT", "/workers/%s/table-chunker/sort" % (wid), headers={"content-type":"application/json"}, data=json.dumps({"order":[[0,"ascending"],[1,"ascending"],[2,"descending"]]}))
print_chunk(connection.request("GET", "/workers/%s/table-chunker/chunk?rows=0-12&columns=0-3" % (wid)))
matches = connection.request("GET", "/workers/%s/table-chunker/search?query=1:5" % (wid))["matches"][0]
column = connection.request("GET", "/workers/%s/table-chunker/chunk?rows=0-%s&columns=1" % (wid, matches[-1] + 5))["data"][0]
for index in matches:
  print index, column[index]
connection.delete_worker(wid, stop=True)
