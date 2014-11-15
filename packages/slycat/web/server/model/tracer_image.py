# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

from slycat.web.server.model import *

import cherrypy
import datetime
import slycat.web.server
import slycat.web.server.database.couchdb
import threading
import traceback

def compute(mid):
  try:
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)

    # Do useful work here

    slycat.web.server.update_model(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

  except:
    cherrypy.log.error("%s" % traceback.format_exc())

    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    slycat.web.server.update_model(database, model, state="finished", result="failed", finished=datetime.datetime.utcnow().isoformat(), message=traceback.format_exc())

def finish(database, model):
  thread = threading.Thread(name="Compute Parameter Image Model", target=compute, kwargs={"mid" : model["_id"]})
  thread.start()
