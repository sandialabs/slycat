def register_slycat_plugin(context):
  """Called during startup when the plugin is loaded."""
  import cherrypy
  import datetime
  import os
  import slycat.web.server

  def finish(database, model):
    """Called to finish the model.  This function must return immediately, so any real work would be done in a separate thread."""
    slycat.web.server.update_model(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

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
  context.register_model("parameter-image", finish, html)

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
    # "js/slycat-navbar.js",
    # "js/slycat-model.js",
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
    "chunker.js",
    "login.js",
    "color-switcher.js",
    "parameter-controls.js",
    "parameter-image-table.js",
    "parameter-image-scatterplot.js",
    "ui.js",
    #For development and debugging, loading some js dynamically inside model.
    #"parameter-image-dendrogram.js",
    #"parameter-image-scatterplot.js",
    #"ui.js"
  ]
  context.register_model_bundle("parameter-image", "text/javascript", [
    os.path.join(os.path.join(os.path.dirname(__file__), "js"), js) for js in javascripts
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
    "ui.css"
  ]
  context.register_model_bundle("parameter-image", "text/css", [
    os.path.join(os.path.dirname(__file__), "css", css) for css in stylesheets
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
  ]
  for image in images:
    context.register_model_resource("parameter-image", image, os.path.join(os.path.dirname(__file__), "img", image))

  # Register jquery ui images, which are expected in images folder
  jqimages = [
    "ui-bg_glass_75_e6e6e6_1x400.png",
    "ui-icons_222222_256x240.png",
    "ui-bg_highlight-soft_75_cccccc_1x100.png",
    "ui-bg_flat_75_ffffff_40x100.png",
    "ui-bg_flat_0_aaaaaa_40x100.png",
  ]
  for jqimage in jqimages:
    context.register_model_resource("parameter-image", "images/" + jqimage, os.path.join(os.path.dirname(__file__), "img", jqimage))
