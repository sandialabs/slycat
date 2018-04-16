# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

def register_slycat_plugin(context):
  """Called during startup when the plugin is loaded."""
  import cherrypy
  import datetime
  import json
  import numpy
  import os
  import re
  import slycat.web.server

  def media_columns(database, model, verb, type, command, **kwargs):
    """Identify columns in the input data that contain media URIs (image or video)."""
    expression = re.compile("file://")
    search = numpy.vectorize(lambda x:bool(expression.search(x)))

    columns = []
    metadata = slycat.web.server.get_model_arrayset_metadata(database, model, "data-table", "0")["arrays"][0]
    for index, attribute in enumerate(metadata["attributes"]):
      if attribute["type"] != "string":
        continue
      column = next(slycat.web.server.get_model_arrayset_data(database, model, "data-table", "0/%s/..." % index))
      if not numpy.any(search(column)):
        continue
      columns.append(index)

    cherrypy.response.headers["content-type"] = "application/json"
    return json.dumps(columns)

  def finish(database, model):
    """Called to finish the model.  This function must return immediately, so any real work would be done in a separate thread."""
    slycat.web.server.update_model(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

  def page_html(database, model):
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
  context.register_model("tracer-image", finish)

  context.register_page("tracer-image", page_html)

  # Register JS
  javascripts = [
    # This JS is loaded by header (global bundle defined in get_model in handlers.py)
    # "js/jquery-2.1.1.min.js",
    # "js/jquery-ui-1.10.4.custom.min.js",
    # "js/knockout-3.2.0.js",
    # "js/knockout.mapping.js",
    # "js/slycat-browser.js",
    # "js/slycat-navbar.js",
    # "js/slycat-model.js",
    # End JS loaded by header
    "jquery-migrate-1.2.1.js",
    "jquery-ui-1.10.4.custom.min.js",
    "jquery.layout-latest.min.js",
    "jquery.ba-bbq.min.js",
    "d3.min.js",
    "chunker.js",
    "color-switcher.js",
    #"jquery.mousewheel.js", # This interferes with dynamically-loaded AMD modules, for some reason.
    "jquery.scrollintoview.min.js",
    "jquery.event.drag-2.2.js",
    "slick.core.js",
    "slick.grid.js",
    "slick.rowselectionmodel.js",
    "slick.headerbuttons.js",
    "slick.autotooltips.js",
    "slick.slycateditors.js",
    "popcorn-complete.js",
    "modernizr.custom.01940.js",
    "plot-control.js",
    "tracer-image-scatterplots.js",
    "tracer-image-table.js",
    "layout.js",
    "movie.js",
    "model.js",
    "selector-brush.js",
    "scatterplot.js",
    "table.js",
    "grid.js",
    "login.js",
    "init.js",
    "load.js",
  ]
  context.register_page_bundle("tracer-image", "text/javascript", [
    os.path.join(os.path.join(os.path.dirname(__file__), "js"), js) for js in javascripts
    ])


  # Register CSS
  stylesheets = [
    # This CSS is loaded by header
    # "css/smoothness/jquery-ui-1.10.4.custom.min.css",
    # "css/jquery.qtip.min.css",
    # "css/namespaced-bootstrap.css",
    # "css/slycat.css",
    # End CSS loaded by header
    "slick.grid.css",
    "slick-default-theme.css",
    "slick.headerbuttons.css",
    "slick-slycat-theme.css",
    "model-tracer-image.css",
  ]
  context.register_page_bundle("tracer-image", "text/css", [
    os.path.join(os.path.join(os.path.dirname(__file__), "css"), css) for css in stylesheets
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
    "build-movie.png",
    "play.png",
    "pause.png",
    "play-reverse.png",
    "fast-forward.png",
    "rewind.png",
    "frame-forward.png",
    "frame-rewind.png",
    "repeat.png",
  ]
  for image in images:
    context.register_page_resource("tracer-image", image, os.path.join(os.path.dirname(__file__), "img", image))

  # Register a custom command for use by the wizard.
  context.register_model_command("GET", "tracer-image", "media-columns", media_columns)

  # Register wizards for creating TI models.
  context.register_wizard("tracer-image", "New Remote Tracer Image Model", require={"action":"create", "context":"project"})
  context.register_wizard_resource("tracer-image", "ui.js", os.path.join(os.path.dirname(__file__), "js/wizard-ui.js"))
  context.register_wizard_resource("tracer-image", "ui.html", os.path.join(os.path.dirname(__file__), "wizard-ui.html"))
