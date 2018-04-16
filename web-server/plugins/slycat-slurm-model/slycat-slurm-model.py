# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

def register_slycat_plugin(context):
  import os

  def finish_model(database, model):
    import datetime
    import slycat.web.server
    slycat.web.server.update_model(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

  def model_html(database, model):
    return open(os.path.join(os.path.dirname(__file__), "ui.html"), "r").read();

  # Register the new model.
  context.register_model("slurm", finish_model)
  context.register_page("slurm", model_html)
  context.register_page_bundle("slurm", "text/css", [
    os.path.join(os.path.dirname(__file__), "ui.css")
  ])
  context.register_page_bundle("slurm", "text/javascript", [
    os.path.join(os.path.dirname(__file__), "ui.js")
  ])

  # Register a wizard for creating instances of the new model.
  context.register_wizard("slurm", "New SLURM Interface", require={"action":"create", "context":"project"})
  context.register_wizard_resource("slurm", "ui.js", os.path.join(os.path.dirname(__file__), "wizard-ui.js"))
  context.register_wizard_resource("slurm", "ui.html", os.path.join(os.path.dirname(__file__), "wizard-ui.html"))
