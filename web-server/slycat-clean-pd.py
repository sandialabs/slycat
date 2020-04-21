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


logFile = 'project-data_CleanupLog.txt'
logging.getLogger().setLevel(logging.INFO)
logging.getLogger().addHandler(logging.FileHandler(logFile))
logging.getLogger().handlers[0].setFormatter(logging.Formatter("{} - %(levelname)s - %(message)s".format(sys.argv[0])))

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
        logging.warning("Waiting for couchdb.")
        time.sleep(2)

if arguments.database not in server:
    server.create(arguments.database)
couchdb = server[arguments.database]
logging.info('Connected to couchdb')

"""
cleans out project data that is not being pointed at
by a parameter space model, and cleans up models that 
are not parameter space but point to project data
"""

# get a view list of all pd ids
for row in couchdb.view("slycat/project_datas"):
    logging.info('Testing PD: {0}'.format(str(row.id)))
    pd_doc = couchdb.get(type="project_data",id=row.id)
    delete_pd = True
    # go through model list in pd and start cleaning
    for model_id in pd_doc['mid']:
        model_doc = couchdb.get(type="model",id=model_id)
        if model_doc is not None:
            if "model-type" in model_doc:
                #log.error("testing model type:[%s]" % str(model_doc["model-type"]))
                if model_doc["model-type"] == "parameter-image":
                    logging.info('Skipping deletion of parameter-image PD: {0}'.format(str(row.id)))
                    delete_pd = False
                # clean up models that don't need pd
                elif "project_data" in model_doc:
                    logging.info('Deleting non-parameter-image PD: {0}'.format(str(row.id)))
                    del model_doc["project_data"]
                    couchdb.save(model_doc)
            # clean up models that don't have a type
            elif "project_data" in model_doc:
                logging.info('Deleting PD: {0} from model without a model-type'.format(str(row.id)))
                del model_doc["project_data"]
                couchdb.save(model_doc)
    if delete_pd:
        # delete project data that doesn't have an associated model 
        logging.info('Deleting PD with NO mid: {0}'.format(str(row.id)))
        couchdb.delete(pd_doc)
        
logging.info('Done deleting project datas')
