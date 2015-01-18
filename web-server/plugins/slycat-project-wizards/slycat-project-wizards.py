def register_slycat_plugin(context):
  import os
  context.register_wizard("slycat-create-project", "New Project", require={"action":"create", "context":"global"})
  context.register_wizard_resource("slycat-create-project", "ui.js", os.path.join(os.path.dirname(__file__), "create-ui.js"))
  context.register_wizard_resource("slycat-create-project", "ui.html", os.path.join(os.path.dirname(__file__), "create-ui.html"))

  context.register_wizard("slycat-delete-project", "Delete Project", require={"action":"delete", "context":"project"})
  context.register_wizard_resource("slycat-delete-project", "ui.js", os.path.join(os.path.dirname(__file__), "delete-ui.js"))
  context.register_wizard_resource("slycat-delete-project", "ui.html", os.path.join(os.path.dirname(__file__), "delete-ui.html"))

