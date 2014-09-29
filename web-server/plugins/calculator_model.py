def register_slycat_plugin(context):
  import os

  def finish(database, model):
    import datetime
    import slycat.web.server.model
    slycat.web.server.model.update(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

  def html(database, model):
    return open(os.path.join(os.path.dirname(__file__), "calculator_model.html")).read()

  context.register_model("calculator", finish, html)

