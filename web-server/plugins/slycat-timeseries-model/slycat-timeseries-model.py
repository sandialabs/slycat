def register_slycat_plugin(context):
  """Called during startup when the plugin is loaded."""
  import datetime
  import os
  import slycat.web.server

  def finish(database, model):
    """Called to finish the model.  This function must return immediately, so any real work would be done in a separate thread."""
    slycat.web.server.update_model(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

  def page_html(database, model):
    """Add the HTML representation of the model to the context object."""
    import json
    import pystache

    context = dict()
    # context["formatted-model"] = json.dumps(model, indent=2, sort_keys=True)
    # context["name"] = model["name"];
    # context["full-project"] = database.get("project", model["project"]);
    context["_id"] = model["_id"];
    context["cluster-type"] = model["artifact:cluster-type"] if "artifact:cluster-type" in model else "null"
    context["cluster-bin-type"] = model["artifact:cluster-bin-type"] if "artifact:cluster-bin-type" in model else "null"
    context["cluster-bin-count"] = model["artifact:cluster-bin-count"] if "artifact:cluster-bin-count" in model else "null"
    return pystache.render(open(os.path.join(os.path.dirname(__file__), "ui.html"), "r").read(), context)

  # Register our new model type
  context.register_model("timeseries", finish)

  context.register_page("timeseries", page_html)

  context.register_page_bundle("timeseries", "text/css", [
    os.path.join(os.path.dirname(__file__), "css/slickGrid/slick.grid.css"),
    os.path.join(os.path.dirname(__file__), "css/slickGrid/slick-default-theme.css"),
    os.path.join(os.path.dirname(__file__), "css/slickGrid/slick.headerbuttons.css"),
    os.path.join(os.path.dirname(__file__), "css/slickGrid/slick-slycat-theme.css"),
    os.path.join(os.path.dirname(__file__), "css/ui.css"),
    ])
  context.register_page_bundle("timeseries", "text/javascript", [
    os.path.join(os.path.dirname(__file__), "js/jquery-ui-1.10.4.custom.min.js"),
    os.path.join(os.path.dirname(__file__), "js/jquery.layout-latest.min.js"),
    os.path.join(os.path.dirname(__file__), "js/jquery.knob.js"),
    os.path.join(os.path.dirname(__file__), "js/d3.min.js"),
    os.path.join(os.path.dirname(__file__), "js/chunker.js"),
    os.path.join(os.path.dirname(__file__), "js/color-switcher.js"),
    os.path.join(os.path.dirname(__file__), "js/timeseries-cluster.js"),
    os.path.join(os.path.dirname(__file__), "js/timeseries-dendrogram.js"),
    os.path.join(os.path.dirname(__file__), "js/timeseries-waveformplot.js"),
    os.path.join(os.path.dirname(__file__), "js/timeseries-table.js"),
    os.path.join(os.path.dirname(__file__), "js/timeseries-legend.js"),
    os.path.join(os.path.dirname(__file__), "js/slickGrid/jquery.event.drag-2.2.js"),
    os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.core.js"),
    os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.grid.js"),
    os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.rowselectionmodel.js"),
    os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.headerbuttons.js"),
    os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.autotooltips.js"),
    #For development and debugging, loading some js dynamically inside model.
    #os.path.join(os.path.dirname(__file__), "js/ui.js"),
    ])
  context.register_page_resource("timeseries", "images", os.path.join(os.path.dirname(__file__), "images"))

  devs = [
    # "js/parameter-image-dendrogram.js",
    # "js/parameter-image-scatterplot.js",
    "js/ui.js",
  ]
  for dev in devs:
    context.register_page_resource("timeseries", dev, os.path.join(os.path.dirname(__file__), dev))

  # Register a wizard for creating instances of the new model
  context.register_wizard("timeseries", "New Timeseries Model", require={"action":"create", "context":"project"})
  context.register_wizard_resource("timeseries", "ui.js", os.path.join(os.path.dirname(__file__), "wizard-ui.js"))
  context.register_wizard_resource("timeseries", "ui.html", os.path.join(os.path.dirname(__file__), "wizard-ui.html"))
