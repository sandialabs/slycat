# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

# coding=utf-8

def register_slycat_plugin(context):
  """
  Called during startup when the plugin is loaded.
  :param context:
  """
  import cherrypy
  import datetime
  import json
  import numpy
  import os
  import re
  import slycat.web.server
  from urlparse import urlparse

  def media_columns(database, model, verb, type, command, **kwargs):
    """Identify columns in the input data that contain media URIs (image or video).
    :param kwargs:
    :param command:
    :param type:
    :param verb:
    :param model:
      model ID in the data base
    :param database:
      our connection to couch db
    """
    expression = re.compile('file://|http')
    search = numpy.vectorize(lambda x:bool(expression.search(x)))

    columns = []
    metadata = slycat.web.server.get_model_arrayset_metadata(database, model, "data-table", "0")["arrays"][0]
    for index, attribute in enumerate(metadata["attributes"]):
      if attribute["type"] != "string":
        continue
      column = slycat.web.server.get_model_arrayset_data(database, model, "data-table", "0/%s/..." % index)
      if not numpy.any(search(column)):
        continue
      columns.append(index)

    cherrypy.response.headers["content-type"] = "application/json"
    return json.dumps(columns)

  def finish(database, model):
    """
    Called to finish the model.
    This function must return immediately,
    so any real work would be done in a separate thread.
    :param model:
      model ID in the data base
    :param database:
      our connection to couch db
    """
    slycat.web.server.update_model(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

  def page_html(database, model):
    """Add the HTML representation of the model to the context object."""
    import json
    import pystache

    context = dict()
    context["formatted-model"] = json.dumps(model, indent=2, sort_keys=True)
    context["_id"] = model["_id"]
    context["name"] = model["name"]
    context["full-project"] = database.get("project", model["project"])
    return pystache.render(open(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../dist/ui_parameter_image.html")), "r").read(), context)

  # Register our new model type
  context.register_model("parameter-image", finish)

  context.register_page("parameter-image", page_html)

  # Set the global_bundles flag to tell slycat not to emit the global JS and CSS files
  context.set_global_bundles("parameter-image", False)

  # Register custom commands for use by wizards.
  context.register_model_command("GET", "parameter-image", "media-columns", media_columns)

  # Register custom wizards for creating PI models.
  context.register_wizard("parameter-image", "New Parameter Space Model", require={"action":"create", "context":"project"})