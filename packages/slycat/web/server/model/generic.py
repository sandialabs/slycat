# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import datetime

def finish(database, model):
  model["state"] = "finished"
  model["result"] = "succeeded"
  model["started"] = model["finished"] = datetime.datetime.utcnow().isoformat()
  model["progress"] = 1.0
  model["uri"] = "%s/models/%s" % (cherrypy.request.base, model["_id"])

  database.save(model)
