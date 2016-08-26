def register_slycat_plugin(context):
  import os
  context.register_wizard("slycat-delete-model", "Delete Model", require={"action":"delete", "context":"model"})
  context.register_wizard_resource("slycat-delete-model", "ui.js", os.path.join(os.path.dirname(__file__), "delete-ui.js"))
  context.register_wizard_resource("slycat-delete-model", "ui.html", os.path.join(os.path.dirname(__file__), "delete-ui.html"))

  context.register_wizard("slycat-edit-model", "Name Model", require={"action":"edit", "context":"model"})
  context.register_wizard_resource("slycat-edit-model", "ui.js", os.path.join(os.path.dirname(__file__), "edit-ui.js"))
  context.register_wizard_resource("slycat-edit-model", "ui.html", os.path.join(os.path.dirname(__file__), "edit-ui.html"))

  context.register_wizard("slycat-create-template", "Template", require={"action":"create", "context":"model"})
  context.register_wizard_resource("slycat-create-template", "ui.js", os.path.join(os.path.dirname(__file__), "create-template-ui.js"))
  context.register_wizard_resource("slycat-create-template", "ui.html", os.path.join(os.path.dirname(__file__), "create-template-ui.html"))

  # Alex commenting this out and instead using the line below because the Save As functionality is not ready yet.
  # context.register_wizard("slycat-create-saved-bookmark", "Save As", require={"action":"create", "context":"model"})
  context.register_wizard("slycat-create-saved-bookmark", "Create New", require={"action":"create", "context":"model"})
  context.register_wizard_resource("slycat-create-saved-bookmark", "ui.js", os.path.join(os.path.dirname(__file__), "create-saved-bookmark-ui.js"))
  context.register_wizard_resource("slycat-create-saved-bookmark", "ui.html", os.path.join(os.path.dirname(__file__), "create-saved-bookmark-ui.html"))

  context.register_wizard("slycat-apply-template", "Apply Template", require={"action":"edit", "context":"model"})
  context.register_wizard_resource("slycat-apply-template", "ui.js", os.path.join(os.path.dirname(__file__), "apply-template-ui.js"))
  context.register_wizard_resource("slycat-apply-template", "ui.html", os.path.join(os.path.dirname(__file__), "apply-template-ui.html"))

  context.register_wizard("slycat-reset-model", "Reset Model", require={"action":"edit", "context":"model"})
  context.register_wizard_resource("slycat-reset-model", "ui.js", os.path.join(os.path.dirname(__file__), "reset-ui.js"))
  context.register_wizard_resource("slycat-reset-model", "ui.html", os.path.join(os.path.dirname(__file__), "reset-ui.html"))

  context.register_wizard("slycat-info-model", "Model Details", require={"action":"info", "context":"model"})
  context.register_wizard_resource("slycat-info-model", "ui.js", os.path.join(os.path.dirname(__file__), "info-ui.js"))
  context.register_wizard_resource("slycat-info-model", "ui.html", os.path.join(os.path.dirname(__file__), "info-ui.html"))
