def register_slycat_plugin(context):
  import os
  context.register_wizard("hello-world", "Hello World Model", require={"project":True})
  context.register_wizard_resource("hello-world", "ui.js", os.path.join(os.path.dirname(__file__), "ui.js"))
  context.register_wizard_resource("hello-world", "ui.html", os.path.join(os.path.dirname(__file__), "ui.html"))
