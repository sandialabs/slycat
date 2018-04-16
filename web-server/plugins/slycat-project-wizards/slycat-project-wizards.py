# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

def register_slycat_plugin(context):
  import os
  context.register_wizard("slycat-create-project", "New Project", require={"action":"create", "context":"global"})
  context.register_wizard_resource("slycat-create-project", "ui.js", os.path.join(os.path.dirname(__file__), "create-ui.js"))
  context.register_wizard_resource("slycat-create-project", "ui.html", os.path.join(os.path.dirname(__file__), "create-ui.html"))

  context.register_wizard("slycat-edit-project", "Edit Project", require={"action":"edit", "context":"project"})
  context.register_wizard_resource("slycat-edit-project", "ui.js", os.path.join(os.path.dirname(__file__), "edit-ui.js"))
  context.register_wizard_resource("slycat-edit-project", "ui.html", os.path.join(os.path.dirname(__file__), "edit-ui.html"))

  context.register_wizard("slycat-info-project", "Project Details", require={"action":"info", "context":"project"})
  context.register_wizard_resource("slycat-info-project", "ui.js", os.path.join(os.path.dirname(__file__), "info-ui.js"))
  context.register_wizard_resource("slycat-info-project", "ui.html", os.path.join(os.path.dirname(__file__), "info-ui.html"))

  context.register_wizard("slycat-delete-project", "Delete Project", require={"action":"delete", "context":"project"})
  context.register_wizard_resource("slycat-delete-project", "ui.js", os.path.join(os.path.dirname(__file__), "delete-ui.js"))
  context.register_wizard_resource("slycat-delete-project", "ui.html", os.path.join(os.path.dirname(__file__), "delete-ui.html"))
  