# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import argparse
import couchdb
import logging
import sys
import time

parser = argparse.ArgumentParser()
parser.add_argument("--database", default="slycat", help="Specify the database name.  Default: %(default)s")
parser.add_argument("--host", default="localhost", help="CouchDB server.  Default: %(default)s")
parser.add_argument("--port", default="5984", help="CouchDB port.  Default: %(default)s")
parser.add_argument("--admin", default="", help="CouchDB admin user.  Default: %(default)s")
parser.add_argument("--password", default="", help="CouchDB admin password.  Default: %(default)s")
arguments = parser.parse_args()


class log(object):
  error = logging.getLogger("error").info
# assuming CouchDB initialization from local process to local server
creds = ""
if arguments.admin != "":
    creds = arguments.admin + ":" + arguments.password + "@"

serverURL = "http://" + creds + arguments.host + ":" + arguments.port + "/"

while True:
    try:
        server = couchdb.Server(serverURL)
        version = server.version()
        break
    except:
        log.error("Waiting for couchdb.")
        time.sleep(2)

if arguments.database not in server:
    server.create(arguments.database)
couchdb = server[arguments.database]
log.error("Connected to couchdb")
"""
cleans out project data that is not being pointed at
by a parameter space model, and cleans up models that 
are not parameter space but point to project data
"""
log.error("going through project data list")
# get a view list of all pd ids
for row in couchdb.view("slycat/project_datas"):
    log.error("testing PD:%s" % str(row.id))
    pd_doc = couchdb.get(type="project_data",id=row.id)
    delete_pd = True
    # go through model list in pd and start cleaning
    for model_id in pd_doc['mid']:
        model_doc = couchdb.get(type="model",id=model_id)
        log.error("testing model type:[%s]" % str(model_doc["model-type"]))
        if model_doc["model-type"] == "parameter-image":
            log.error("found parameter-image not deleting PD: %s" % str(row.id))
            delete_pd = False
        # clean up models that don't need pd
        elif "project_data" in model_doc:
            log.error("Removing PD from none parameter-space model")
            del model_doc["project_data"]
            couchdb.save(model_doc)
    if delete_pd:
        # delete the bad project data
        log.error("starting Deletion of PD::: %s" % str(row.id))
        couchdb.delete(pd_doc)
        log.error("finished Deletion of PD::: %s" % str(row.id))
log.error("**Finished running slycat-clean-pd script**")
