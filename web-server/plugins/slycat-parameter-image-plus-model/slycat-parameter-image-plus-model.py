def register_slycat_plugin(context):
  """Called during startup when the plugin is loaded."""
  import cherrypy
  import datetime
  import os
  import slycat.web.server.database.couchdb
  import slycat.web.server.model
  import threading
  import traceback

  def compute(mid):
    """Called in a thread to perform work on the model."""
    try:
      database = slycat.web.server.database.couchdb.connect()
      model = database.get("model", mid)

      # Do useful work here

      slycat.web.server.model.update(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

    except:
      cherrypy.log.error("%s" % traceback.format_exc())

      database = slycat.web.server.database.couchdb.connect()
      model = database.get("model", mid)
      slycat.web.server.model.update(database, model, state="finished", result="failed", finished=datetime.datetime.utcnow().isoformat(), message=traceback.format_exc())

  def finish(database, model):
    """Called to finish the model.  This function must return immediately, so the actual work is done in a separate thread."""
    thread = threading.Thread(name="Compute Generic Model", target=compute, kwargs={"mid" : model["_id"]})
    thread.start()

  def html(database, model):
    """Add the HTML representation of the model to the context object."""
    import json
    import pystache

    context = dict()
    context["formatted-model"] = json.dumps(model, indent=2, sort_keys=True)
    context["_id"] = model["_id"];
    context["full-project"] = database.get("project", model["project"]);
    return pystache.render(open(os.path.join(os.path.dirname(__file__), "ui.html"), "r").read(), context)

  # Register our new model type
  context.register_model("parameter-image-plus", finish, html)

  
  context.register_model_resource("parameter-image-plus", "jquery.layout-latest.min.js", os.path.join(os.path.dirname(__file__), "jquery.layout-latest.min.js"))
  context.register_model_resource("parameter-image-plus", "jquery.ba-bbq.min.js", os.path.join(os.path.dirname(__file__), "jquery.ba-bbq.min.js"))
  context.register_model_resource("parameter-image-plus", "d3.min.js", os.path.join(os.path.dirname(__file__), "d3.min.js"))
  context.register_model_resource("parameter-image-plus", "bookmarker.js", os.path.join(os.path.dirname(__file__), "bookmarker.js"))
  context.register_model_resource("parameter-image-plus", "chunker.js", os.path.join(os.path.dirname(__file__), "chunker.js"))
  context.register_model_resource("parameter-image-plus", "color-switcher.js", os.path.join(os.path.dirname(__file__), "color-switcher.js"))
  context.register_model_resource("parameter-image-plus", "parameter-controls.js", os.path.join(os.path.dirname(__file__), "parameter-controls.js"))
  context.register_model_resource("parameter-image-plus", "parameter-image-scatterplot.js", os.path.join(os.path.dirname(__file__), "parameter-image-scatterplot.js"))
  context.register_model_resource("parameter-image-plus", "parameter-image-table.js", os.path.join(os.path.dirname(__file__), "parameter-image-table.js"))
  context.register_model_resource("parameter-image-plus", "jquery.mousewheel.js", os.path.join(os.path.dirname(__file__), "jquery.mousewheel.js"))
  context.register_model_resource("parameter-image-plus", "jquery.scrollintoview.min.js", os.path.join(os.path.dirname(__file__), "jquery.scrollintoview.min.js"))
  context.register_model_resource("parameter-image-plus", "jquery.event.drag-2.2.js", os.path.join(os.path.dirname(__file__), "jquery.event.drag-2.2.js"))
  context.register_model_resource("parameter-image-plus", "slick.core.js", os.path.join(os.path.dirname(__file__), "slick.core.js"))
  context.register_model_resource("parameter-image-plus", "slick.grid.js", os.path.join(os.path.dirname(__file__), "slick.grid.js"))
  context.register_model_resource("parameter-image-plus", "slick.rowselectionmodel.js", os.path.join(os.path.dirname(__file__), "slick.rowselectionmodel.js"))
  context.register_model_resource("parameter-image-plus", "slick.headerbuttons.js", os.path.join(os.path.dirname(__file__), "slick.headerbuttons.js"))
  context.register_model_resource("parameter-image-plus", "slick.autotooltips.js", os.path.join(os.path.dirname(__file__), "slick.autotooltips.js"))
  context.register_model_resource("parameter-image-plus", "slick.slycateditors.js", os.path.join(os.path.dirname(__file__), "slick.slycateditors.js"))

  context.register_model_resource("parameter-image-plus", "ui.js", os.path.join(os.path.dirname(__file__), "ui.js"))

  context.register_model_resource("parameter-image-plus", "slick.grid.css", os.path.join(os.path.dirname(__file__), "slick.grid.css"))
  context.register_model_resource("parameter-image-plus", "slick-default-theme.css", os.path.join(os.path.dirname(__file__), "slick-default-theme.css"))
  context.register_model_resource("parameter-image-plus", "slick.headerbuttons.css", os.path.join(os.path.dirname(__file__), "slick.headerbuttons.css"))
  context.register_model_resource("parameter-image-plus", "slick-slycat-theme.css", os.path.join(os.path.dirname(__file__), "slick-slycat-theme.css"))
  context.register_model_resource("parameter-image-plus", "ui.css", os.path.join(os.path.dirname(__file__), "ui.css"))
