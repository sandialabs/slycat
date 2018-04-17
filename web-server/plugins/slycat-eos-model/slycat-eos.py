# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

def register_slycat_plugin(context):
  import os

  def finish(database, model):
    import datetime
    import slycat.web.server
    slycat.web.server.update_model(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

  def html(database, model):
    name = model["artifact:name"]
    return """
      <div style="-webkit-flex:1;flex:1;display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;-webkit-justify-content:center;justify-content:center;padding:12px; text-align:center; font-weight: bold; font-size: 36px;">
        <p>Hello, %s!</p>
      </div>""" % name

  # Register the new model.
  context.register_model("eos", finish)

  # Register a default page for displaying the model.
  context.register_page("eos", html)

  # Register a wizard for creating instances of the new model.
  context.register_wizard("eos", "New EOS Model", require={"action":"create", "context":"project"})
  context.register_wizard_resource("eos", "ui.js", os.path.join(os.path.dirname(__file__), "ui.js"))
  context.register_wizard_resource("eos", "ui.html", os.path.join(os.path.dirname(__file__), "ui.html"))
