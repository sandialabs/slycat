# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import slycat.client
import getpass
import json
import optparse
import sys

parser = optparse.OptionParser()
parser.add_option("--host", default="https://localhost:8092", help="Root URL of the Slycat server.  Default: %default")
parser.add_option("--http-proxy", default="", help="HTTP proxy URL.  Default: %default")
parser.add_option("--https-proxy", default="", help="HTTPS proxy URL.  Default: %default")
parser.add_option("--no-verify", default=False, action="store_true", help="Disable HTTPS host certificate verification.")
parser.add_option("--user", default=getpass.getuser(), help="Slycat username.  Default: %default")
options, arguments = parser.parse_args()

if len(arguments) != 1:
  raise Exception("You must specify exactly one model id to duplicate.")
omid = arguments[0]

connection = slycat.client.connection(auth=(options.user, getpass.getpass("%s password: " % options.user)), host=options.host, proxies={"http":options.http_proxy, "https":options.https_proxy}, verify=not options.no_verify)

original_model = connection.request("GET", "/models/%s" % omid, headers={"accept":"application/json"})
pid = original_model["project"]
name = "%s Copy" % (original_model["name"])
description = "Duplicate of model %s(%s)" % (original_model["name"], omid)

mwid = connection.request("POST", "/projects/%s/models" % (pid), headers={"content-type":"application/json"}, data=json.dumps({"model-type":"cca3", "name":name, "description":description}))["wid"]
connection.request("POST", "/workers/%s/model/copy-model-inputs" % (mwid), headers={"content-type":"application/json"}, data=json.dumps({"mid":omid}))
mid = connection.request("POST", "/workers/%s/model/finish-model" % (mwid), headers={"content-type":"application/json"}, data=json.dumps({}))["mid"]
#connection.delete_worker(mwid)

sys.stderr.write("Your new model will be at %s/models/%s when complete.\n" % (options.host, mid))
