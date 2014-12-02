def register_slycat_plugin(context):
  import os
  context.register_model_wizard("hello-world", "New Hello World Model")
  context.register_model_wizard_resource("hello-world", "ui.js", os.path.join(os.path.dirname(__file__), "ui.js"))
  context.register_model_wizard_resource("hello-world", "ui.html", os.path.join(os.path.dirname(__file__), "ui.html"))
