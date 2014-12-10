def register_slycat_plugin(context):
  import os
  context.register_model_wizard("tracer-image", "Remote Tracer Image Model")
  context.register_model_wizard_resource("tracer-image", "ui.js", os.path.join(os.path.dirname(__file__), "ui.js"))
  context.register_model_wizard_resource("tracer-image", "ui.html", os.path.join(os.path.dirname(__file__), "ui.html"))
