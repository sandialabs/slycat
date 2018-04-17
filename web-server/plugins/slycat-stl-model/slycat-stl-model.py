# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

def register_slycat_plugin(context):
  import os

  def finish_model(database, model):
    import datetime
    import slycat.web.server
    slycat.web.server.update_model(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

  def page_html(database, model):
    return open(os.path.join(os.path.dirname(__file__), 'ui.html'), 'r').read();

  # Register the new model.
  context.register_model("stl", finish_model)

  context.register_page("stl", page_html)

  context.register_page_bundle("stl", "text/css", [
    os.path.join(os.path.dirname(__file__), 'ui.css')
  ])

  context.register_page_bundle('stl', 'text/javascript', [
    os.path.join(os.path.dirname(__file__), 'js/three.min.js'),
    os.path.join(os.path.dirname(__file__), 'js/TrackballControls.js'),
    os.path.join(os.path.dirname(__file__), 'js/STLLoader.js'),
    os.path.join(os.path.dirname(__file__), 'js/stats.min.js'),
    os.path.join(os.path.dirname(__file__), 'ui.js')
  ])

  # Register a wizard for creating instances of the new model.
  context.register_wizard("stl", "New STL Model", require={"action":"create", "context":"project"})
  context.register_wizard_resource("stl", "ui.js", os.path.join(os.path.dirname(__file__), "wizard-ui.js"))
  context.register_wizard_resource("stl", "ui.html", os.path.join(os.path.dirname(__file__), "wizard-ui.html"))
