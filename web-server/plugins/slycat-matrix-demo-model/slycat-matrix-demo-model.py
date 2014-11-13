def register_slycat_plugin(context):
  import datetime
  import json
  import os
  import slycat.web.server.model

  def finish(database, model):
    slycat.web.server.model.update(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

  def html(database, model):
    return open(os.path.join(os.path.dirname(__file__), "ui.html"), "r").read()

  def product(database, model, command, **kwargs):
    pass

  def hadamard_product(database, model, command, **kwargs):
    pass

  def kronecker_product(database, model, command, **kwargs):
    pass

  context.register_model("matrix-demo", finish, html)
  context.register_model_command("matrix-demo", "product", product)
  context.register_model_command("matrix-demo", "hadamard-product", hadamard_product)
  context.register_model_command("matrix-demo", "kronecker-product", kronecker_product)

  context.register_model_bundle("matrix-demo", "text/css", [
    os.path.join(os.path.dirname(__file__), "ui.css"),
    ])

  context.register_model_bundle("matrix-demo", "text/javascript", [
    os.path.join(os.path.dirname(__file__), "ui.js"),
    os.path.join(os.path.dirname(__file__), "jquery.layout-latest.min.js"),
    ])

