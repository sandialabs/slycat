def register_slycat_plugin(context):
  import os
  context.register_model_wizard("cca", "New CCA Model")
  context.register_model_wizard_resource("cca", "ui.js", os.path.join(os.path.dirname(__file__), "ui.js"))
  context.register_model_wizard_resource("cca", "ui.html", os.path.join(os.path.dirname(__file__), "ui.html"))
