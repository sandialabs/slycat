def register_slycat_plugin(context):

  def finish(database, model):
    import datetime
    import slycat.web.server.model
    slycat.web.server.update_model(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

  def html(database, model):
    return "<div style='margin:12px; text-align:center; font-weight: bold; font-size: 24px;'>Hello, World!</div>"

  context.register_model("hello-world", finish, html)

