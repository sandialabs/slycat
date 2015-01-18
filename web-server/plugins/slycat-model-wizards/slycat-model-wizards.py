def register_slycat_plugin(context):
  import os
  context.register_wizard("slycat-delete-model", "Delete Model", require={"action":"delete", "context":"model"})
  context.register_wizard_resource("slycat-delete-model", "ui.js", os.path.join(os.path.dirname(__file__), "delete-ui.js"))
  context.register_wizard_resource("slycat-delete-model", "ui.html", os.path.join(os.path.dirname(__file__), "delete-ui.html"))

