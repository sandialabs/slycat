# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import datetime
import slycat.web.server.database.couchdb
import threading
import traceback

def compute(mid):
  try:
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)

    # Do useful work here

    model["state"] = "finished"
    model["result"] = "succeeded"
    model["finished"] = datetime.datetime.utcnow().isoformat()
    model["progress"] = 1.0
    database.save(model)

  except:
    cherrypy.log.error("%s" % traceback.format_exc())

    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    model["state"] = "finished"
    model["result"] = "failed"
    model["finished"] = datetime.datetime.utcnow().isoformat()
    model["progress"] = None
    model["message"] = traceback.format_exc()
    database.save(model)

def finish(database, model):
  thread = threading.Thread(name="Compute Generic Model", target=compute, kwargs={"mid" : model["_id"]})
  thread.start()
