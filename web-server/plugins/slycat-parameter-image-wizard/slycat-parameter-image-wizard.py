def register_slycat_plugin(context):
  import os
  context.register_wizard("parameter-image", "Remote Parameter Image Model")
  context.register_wizard_resource("parameter-image", "ui.js", os.path.join(os.path.dirname(__file__), "ui.js"))
  context.register_wizard_resource("parameter-image", "ui.html", os.path.join(os.path.dirname(__file__), "ui.html"))
