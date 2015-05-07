def register_slycat_plugin(context):
  """Called during startup when the plugin is loaded."""
  import cherrypy
  import datetime
  import json
  import numpy
  import os
  import re
  import slycat.web.server
  from urlparse import urlparse

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


  def set_tree_node(node, column):
    """Sets up a tree node"""
    node["columns"] = set([str(column)])
    node["children"] = dict()

  def update_tree(node, column, paths):
    """Updates trees within the forest with paths"""
    if len(paths) < 1:
      return

    n = paths.pop(0)
    if n not in node["children"]:
      n_obj = dict()
      set_tree_node(n_obj, column)
      node["children"][n] = n_obj
      update_tree(n_obj, column, paths)
    else:
      n_obj = node["children"][n]
      n_obj["columns"].add(str(column))
      update_tree(n_obj, column, paths)

  def update_forest(forest, uris, column):
    """Updates forest with new list of URIs"""
    for uri in uris:
      parsed = urlparse(uri)
      host = parsed.hostname

      if host not in forest:
        forest[host] = {}

      path_arr = parsed.path.split('/')
      path_arr.pop() # removes filename + extension
      if path_arr[0] == "":
        path_arr.pop(0) # removes first item if empty string

      root = path_arr.pop(0)
      if root not in forest[host]:
        root_obj = dict()
        set_tree_node(root_obj, column)
        forest[host][root] = root_obj
        update_tree(root_obj, column, path_arr)
      else:
        root_obj = forest[host][root]
        root_obj["columns"].add(str(column))
        update_tree(root_obj, column, path_arr)

  def process_tree(path_arr, node):
    """Determines the longest common path for a given path"""
    if len(node["children"]) == 1:
      for n in node["children"]:
        path_arr.append(n)
        return process_tree(path_arr, node["children"][n])
    else:
      obj = dict()
      obj["path"] = "/".join(path_arr)
      obj["column"] = ",".join(reversed(list(node["columns"])))
      return obj

  def format_forest(forest):
    formatted = {}
    for host in forest:
      formatted[host] = {}
      for root in forest[host]:
        obj = process_tree([root], forest[host][root])

        if obj["column"] not in formatted[host]:
          formatted[host][obj["column"]] = set()

        formatted[host][obj["column"]].add(obj["path"])
    return formatted

  def list_uris(database, model, verb, type, command, **kwargs):
    """Parses out all unique root URIs from the db table"""
    cherrypy.log.error("list_uris: %s" % kwargs)

    try:
      columns = [int(column) for column in kwargs["columns"]]
    except:
      raise cherrypy.HTTPError("400 Missing / invalid columns parameter.")

    forest = {}
    for column in columns:
      tmp_uris = next(slycat.web.server.get_model_arrayset_data(database, model, "data-table", "0/%s/..." % column))
      update_forest(forest, tmp_uris, column)

    formatted_forest = format_forest(forest)

    # sets have to be turned into arrays to be JSON serializable
    for host in formatted_forest:
      for column in formatted_forest[host]:
        formatted_forest[host][column] = list(formatted_forest[host][column])

    return json.dumps({"uris": formatted_forest})


  def search_and_replace(database, model, verb, type, command, **kwargs):
    """Perform a regular-expression search-and-replace on columns in the input data."""
    cherrypy.log.error("search_and_replace: %s" % kwargs)

    try:
      columns = [int(column) for column in kwargs["columns"]]
    except:
      raise cherrypy.HTTPError("400 Missing / invalid columns parameter.")

    try:
      replace = kwargs["replace"]
    except:
      raise cherrypy.HTTPError("400 Missing / invalid replace parameter.")

    try:
      search = re.compile(kwargs["search"])
    except:
      raise cherrypy.HTTPError("400 Missing / invalid search parameter.")

    for attribute in columns:
      before = next(slycat.web.server.get_model_arrayset_data(database, model, "data-table", "0/%s/..." % attribute))
      #cherrypy.log.error("before: %s %s" % (type(before), before))
      after = numpy.array([search.sub(replace, value) for value in before])
      #cherrypy.log.error("after: %s" % after)
      slycat.web.server.put_model_arrayset_data(database, model, "data-table", "0/%s/..." % attribute, [after])

    return json.dumps({"ok":True})

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
    "jquery-ui-1.10.4.custom.min.js",
    "jquery.layout-latest.min.js",
    "d3.min.js",
    #"jquery.mousewheel.js",
    "jquery.scrollintoview.min.js",
    "jquery.event.drag-2.2.js",
    "slick.core.js",
    "slick.grid.js",
    "slick.rowselectionmodel.js",
    "slick.headerbuttons.js",
    "slick.autotooltips.js",
    "slick.slycateditors.js",
    "chunker.js",
    "color-switcher.js",
    "bookmark-display.js",
    "note-manager.js",
    "filter-manager.js",
    "category-select.js",
    "stickies.core.js",
    # "parameter-controls.js",
    # "parameter-image-table.js",
    # "parameter-image-scatterplot.js",
    # "ui.js",
    #For development and debugging, comment out js here and load it dynamically inside model.
  ]
  context.register_model_bundle("parameter-image", "text/javascript", [
    os.path.join(os.path.join(os.path.dirname(__file__), "js"), js) for js in javascripts
    ])

  # Register CSS
  stylesheets = [
    "jquery-ui/jquery-ui.css",
    "jquery-ui/jquery.ui.theme.css",
    "jquery-ui/jquery.ui.resizable.css",
    "stickies.css",
    "slick.grid.css",
    "slick-default-theme.css",
    "slick.headerbuttons.css",
    "slick-slycat-theme.css",
    #
    "ui.css",
    "slycat-additions.css",
    #For development and debugging, comment out css here and load it dynamically inside model.
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
    "ajax-loader.gif",
    # for stickies
    'ui-icons_222222_256x240.png',
    'ui-bg_highlight-soft_75_cccccc_1x100.png',
    'ui-bg_flat_75_ffffff_40x100.png',
    'ui-bg_glass_75_e6e6e6_1x400.png',
  ]
  for image in images:
    context.register_model_resource("parameter-image", image, os.path.join(os.path.dirname(__file__), "img", image))

  devs = [
    "js/parameter-controls.js",
    "js/parameter-image-table.js",
    "js/parameter-image-scatterplot.js",
    "js/ui.js",
    #"css/ui.css",
    "slycat-category-select.html",
  ]
  for dev in devs:
    context.register_model_resource("parameter-image", dev, os.path.join(os.path.dirname(__file__), dev))

  # Register custom commands for use by wizards.
  context.register_model_command("GET", "parameter-image", "media-columns", media_columns)
  context.register_model_command("POST", "parameter-image", "search-and-replace", search_and_replace)
  context.register_model_command("GET", "parameter-image", "list-uris", list_uris)

  # Register custom wizards for creating PI models.
  context.register_wizard("parameter-image", "New Remote Parameter Image Model", require={"action":"create", "context":"project"})
  context.register_wizard_resource("parameter-image", "ui.js", os.path.join(os.path.dirname(__file__), "js/wizard-ui.js"))
  context.register_wizard_resource("parameter-image", "ui.html", os.path.join(os.path.dirname(__file__), "wizard-ui.html"))

  context.register_wizard("remap-parameter-image", "Remapped Parameter Image Model", require={"action":"create", "context":"model", "model-type":["parameter-image"]})
  context.register_wizard_resource("remap-parameter-image", "ui.js", os.path.join(os.path.dirname(__file__), "js/remap-ui.js"))
  context.register_wizard_resource("remap-parameter-image", "ui.html", os.path.join(os.path.dirname(__file__), "remap-ui.html"))

