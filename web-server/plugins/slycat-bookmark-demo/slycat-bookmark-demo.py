def register_slycat_plugin(context):
  import os

  # Register the bookmark-demo model.
  def finish_model(database, model):
    import datetime
    import slycat.web.server
    slycat.web.server.update_model(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

  def model_html(database, model):
    return open(os.path.join(os.path.dirname(__file__), "ui.html"), "r").read()

  context.register_model("bookmark-demo", finish_model, model_html)
  context.register_model_bundle("bookmark-demo", "text/javascript", [
    os.path.join(os.path.dirname(__file__), "ui.js"),
    ])

  # Register a wizard for creating instances of the bookmark-demo model.
  context.register_wizard("bookmark-demo", "New Bookmark Demo Model", require={"action":"create", "context":"project"})
  context.register_wizard_resource("bookmark-demo", "ui.js", os.path.join(os.path.dirname(__file__), "wizard-ui.js"))
  context.register_wizard_resource("bookmark-demo", "ui.html", os.path.join(os.path.dirname(__file__), "wizard-ui.html"))
