def register_slycat_plugin(context):
  import cherrypy
  import datetime
  import json
  import os
  import pystache
  import slycat.web.server.model

  def finish(database, model):
    slycat.web.server.model.update(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

  def html(database, model):
    context = dict()
    context["server-root"] = cherrypy.request.app.config["slycat"]["server-root"]
    context["js-bundle"] = js_bundle
    return pystache.render(open(os.path.join(os.path.dirname(__file__), "ui.html"), "r").read(), context)

  def hadamard_product(database, model, command, **kwargs):
      return json.dumps(model["artifact:a"] + model["artifact:b"])

  context.register_model("matrix-demo", finish, html)
  context.register_model_command("matrix-demo", "hadamard-product", hadamard_product)

  css_bundle = context.register_model_bundle("matrix-demo", "text/css", [
    os.path.join(os.path.dirname(__file__), "ui.css"),
    ])

  js_bundle = context.register_model_bundle("matrix-demo", "text/javascript", [
    os.path.join(os.path.dirname(__file__), "ui.js"),
    os.path.join(os.path.dirname(__file__), "jquery.layout-latest.min.js"),
    ])

