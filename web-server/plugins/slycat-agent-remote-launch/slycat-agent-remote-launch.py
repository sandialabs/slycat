def register_slycat_plugin(context):
  import os

  def finish_model(database, model):
    import datetime
    import slycat.web.server
    slycat.web.server.update_model(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

  def model_html(database, model):
    return open(os.path.join(os.path.dirname(__file__), 'ui.html'), 'r').read();

  # Register the new model.
  context.register_model("agent-remote-launch", finish_model)
  context.register_page("agent-remote-launch", model_html)
  context.register_page_bundle("agent-remote-launch", "text/css", [
    os.path.join(os.path.dirname(__file__), 'ui.css')
  ])

  context.register_page_bundle('agent-remote-launch', 'text/javascript', [
    os.path.join(os.path.dirname(__file__), 'ui.js')
  ])

  # Register a wizard for creating instances of the new model.
  context.register_wizard("agent-remote-launch", "New Agent Remote Launch", require={"action":"create", "context":"project"})
  context.register_wizard_resource("agent-remote-launch", "ui.js", os.path.join(os.path.dirname(__file__), "wizard-ui.js"))
  context.register_wizard_resource("agent-remote-launch", "ui.html", os.path.join(os.path.dirname(__file__), "wizard-ui.html"))