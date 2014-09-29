def register_slycat_plugin(context):
  import datetime
  import json
  import os
  import slycat.web.server.model

  def finish(database, model):
    slycat.web.server.model.update(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

  def html(database, model):
    return open(os.path.join(os.path.dirname(__file__), "calculator_model.html")).read()

  def calculate(database, model, command, **kwargs):
    if command == "add":
      return json.dumps(model["artifact:a"] + model["artifact:b"])
    if command == "subtract":
      return json.dumps(model["artifact:a"] - model["artifact:b"])

  context.register_model("calculator", finish, html)
  context.register_model_command("calculator", "add", calculate)
  context.register_model_command("calculator", "subtract", calculate)

