# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

def register_slycat_plugin(context):
  import os
  context.register_wizard("slycat-create-project", "New Project", require={"action":"create", "context":"global"})
  context.register_wizard("slycat-edit-project", "Edit Project", require={"action":"edit", "context":"global"})
  context.register_wizard("slycat-info-project", "Project Details", require={"action":"info", "context":"global"})
  context.register_wizard("slycat-delete-project", "Delete Project", require={"action":"delete", "context":"project"})
  