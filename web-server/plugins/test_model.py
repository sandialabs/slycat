def register_slycat_plugin(context):

  def finish(database, model):
    import datetime
    import slycat.web.server.model
    slycat.web.server.model.update(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

  def html(database, model):
    return "<h1>Hello, World!</h1>"

  context.register_model("test", finish, html)

