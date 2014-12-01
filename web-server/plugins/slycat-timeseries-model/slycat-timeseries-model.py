def register_slycat_plugin(context):
  """Called during startup when the plugin is loaded."""
  import datetime
  import slycat.web.server

  def finish(database, model):
    """Called to finish the model.  This function must return immediately, so any real work would be done in a separate thread."""
    slycat.web.server.update_model(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

  def html(database, model):
    """Add the HTML representation of the model to the context object."""
    return ""

  # Register our new model type
  context.register_model("timeseries", finish, html)
