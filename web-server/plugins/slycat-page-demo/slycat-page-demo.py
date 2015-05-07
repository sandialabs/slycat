def register_slycat_plugin(context):
  import datetime
  import os
  import slycat.web.server

  def finish_model(database, model):
    """Called to finish the model.  This function must return quickly, so actual work should be done in a separate thread."""
    slycat.web.server.update_model(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

  def parent_html(database, model):
    return open(os.path.join(os.path.dirname(__file__), "parent-ui.html"), "r").read()

  def child_html(database, model):
    return open(os.path.join(os.path.dirname(__file__), "child-ui.html"), "r").read()

  context.register_model("page-demo", finish_model, parent_html)
  context.register_model_bundle("page-demo", "text/javascript", [
    os.path.join(os.path.dirname(__file__), "parent-ui.js"),
    ])

  context.register_page("page-demo-child", child_html)
  context.register_page_bundle("page-demo-child", "text/javascript", [
    os.path.join(os.path.dirname(__file__), "child-ui.js"),
    ])

  # Register a wizard for creating instances of the page-demo model.
  context.register_wizard("page-demo", "New Page Demo Model", require={"action":"create", "context":"project"})
  context.register_wizard_resource("page-demo", "ui.js", os.path.join(os.path.dirname(__file__), "wizard-ui.js"))
  context.register_wizard_resource("page-demo", "ui.html", os.path.join(os.path.dirname(__file__), "wizard-ui.html"))
