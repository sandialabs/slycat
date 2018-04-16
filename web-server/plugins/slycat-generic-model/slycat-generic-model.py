# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

def register_slycat_plugin(context):
  """Called during startup when the plugin is loaded."""
  import cherrypy
  import datetime
  import os
  import slycat.web.server.database.couchdb
  import slycat.web.server
  import threading
  import traceback

  def compute(mid):
    """Called in a thread to perform work on the model."""
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
    """Called to finish the model.  This function must return immediately, so the actual work is done in a separate thread."""
    thread = threading.Thread(name="Compute Generic Model", target=compute, kwargs={"mid" : model["_id"]})
    thread.start()

  def page_html(database, model):
    """Add the HTML representation of the model to the context object."""
    return open(os.path.join(os.path.dirname(__file__), "ui.html"), "r").read()

  # Register our new model type
  context.register_model("generic", finish)

  context.register_page("generic", page_html)

  context.register_page_bundle("generic", "text/javascript", [
    os.path.join(os.path.dirname(__file__), "ui.js"),
    ])
