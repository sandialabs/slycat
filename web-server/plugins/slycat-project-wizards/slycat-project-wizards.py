def register_slycat_plugin(context):
  import os
  context.register_wizard("slycat-create-project", "Empty Project", require={"context":"create"})
  context.register_wizard_resource("slycat-create-project", "ui.js", os.path.join(os.path.dirname(__file__), "create-ui.js"))
  context.register_wizard_resource("slycat-create-project", "ui.html", os.path.join(os.path.dirname(__file__), "create-ui.html"))

