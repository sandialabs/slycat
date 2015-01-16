def register_slycat_plugin(context):
  import os
  context.register_wizard("project", "Empty Project", require={})
  context.register_wizard_resource("project", "ui.js", os.path.join(os.path.dirname(__file__), "ui.js"))
  context.register_wizard_resource("project", "ui.html", os.path.join(os.path.dirname(__file__), "ui.html"))
