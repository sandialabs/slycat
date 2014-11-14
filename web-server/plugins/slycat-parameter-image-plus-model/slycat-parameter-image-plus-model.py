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

  def html(database, model):
    """Add the HTML representation of the model to the context object."""
    import json
    import pystache

    context = dict()
    context["formatted-model"] = json.dumps(model, indent=2, sort_keys=True)
    context["_id"] = model["_id"];
    context["name"] = model["name"];
    context["full-project"] = database.get("project", model["project"]);
    return pystache.render(open(os.path.join(os.path.dirname(__file__), "ui.html"), "r").read(), context)

  # Register our new model type
  context.register_model("parameter-image-plus", finish, html)

  # Register JS
  javascripts = [
    # This JS is loaded by header 
    # "js/jquery-2.1.1.min.js",
    # "js/jquery-migrate-1.2.1.js",
    # "js/jquery.json-2.4.min.js",
    # "js/jquery-ui-1.10.4.custom.min.js",
    # "js/jquery.knob.js",
    # "js/jquery.qtip.min.js",
    # "js/knockout-3.2.0.js",
    # "js/knockout.mapping.js",
    # "js/slycat-browser.js",
    # "js/slycat-header.js",
    # "js/slycat-model-main.js",
    # End JS loaded by header
    "jquery.layout-latest.min.js", 
    "jquery.ba-bbq.min.js",
    "d3.min.js",
    "jquery.mousewheel.js",
    "jquery.scrollintoview.min.js",
    "jquery.event.drag-2.2.js",
    "slick.core.js",
    "slick.grid.js",
    "slick.rowselectionmodel.js",
    "slick.headerbuttons.js",
    "slick.autotooltips.js",
    "slick.slycateditors.js",
    "bookmarker.js",
    "chunker.js",
    "color-switcher.js",
    "parameter-controls.js",
    "parameter-image-scatterplot.js",
    "parameter-image-table.js",
    #For development and debugging, loading ui.js dynamically inside model.
    #"ui.js",
  ]
  context.register_model_bundle("parameter-image-plus", "text/javascript", [
    os.path.join(os.path.dirname(__file__), js) for js in javascripts
    ])

  # Register CSS
  stylesheets = [
    # This CSS is loaded by header
    # "css/smoothness/jquery-ui-1.10.4.custom.min.css",
    # "css/jquery.qtip.min.css",
    # "css/slycat.css",
    # End CSS loaded by header
    "slick.grid.css",
    "slick-default-theme.css",
    "slick.headerbuttons.css",
    "slick-slycat-theme.css",
    #For development and debugging, loading ui.css dynamically inside model.
    #"ui.css",
  ]
  context.register_model_bundle("parameter-image-plus", "text/css", [
    os.path.join(os.path.dirname(__file__), css) for css in stylesheets
    ])

  # Register images and other resources
  images = [
    "x-gray.png",
    "x-light.png",
    "y-gray.png",
    "y-light.png",
    "sort-asc-light.png",
    "sort-asc-gray.png",
    "sort-desc-light.png",
    "sort-desc-gray.png",
    "image-gray.png",
    "image-light.png",
    "stripe1.png",
    "stripe2.png",
    "pin.png",
    #For development and debugging, loading ui.js dynamically inside model.
    "ui.js",
    #For development and debugging, loading ui.css dynamically inside model.
    "ui.css",
  ]
  for image in images:
    context.register_model_resource("parameter-image-plus", image, os.path.join(os.path.dirname(__file__), image))
