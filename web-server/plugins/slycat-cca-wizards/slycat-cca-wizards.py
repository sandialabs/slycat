def register_slycat_plugin(context):
  import os
  context.register_model_wizard("remote-cca", "Remote CCA Model")
  context.register_model_wizard_resource("remote-cca", "ui.js", os.path.join(os.path.dirname(__file__), "remote-ui.js"))
  context.register_model_wizard_resource("remote-cca", "ui.html", os.path.join(os.path.dirname(__file__), "remote-ui.html"))

  context.register_model_wizard("local-cca", "Local CCA Model")
  context.register_model_wizard_resource("local-cca", "ui.js", os.path.join(os.path.dirname(__file__), "local-ui.js"))
  context.register_model_wizard_resource("local-cca", "ui.html", os.path.join(os.path.dirname(__file__), "local-ui.html"))
