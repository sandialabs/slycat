# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

def register_slycat_plugin(context):
  import os
  context.register_wizard("slycat-delete-model", "Delete Model", require={"action":"delete", "context":"model"})
  context.register_wizard("slycat-edit-model", "Model Name & Info", require={"action":"edit", "context":"model"})

  context.register_wizard("slycat-edit-project", "Edit Project", require={"action":"edit", "context":"model"})
  
  context.register_wizard("slycat-create-template", "Template", require={"action":"create", "context":"model"})
  # Alex commenting this out and instead using the line below because the Save As functionality is not ready yet.
  # context.register_wizard("slycat-create-saved-bookmark", "Save As", require={"action":"create", "context":"model"})
  context.register_wizard("slycat-create-saved-bookmark", "Create New", require={"action":"create", "context":"model"})
  context.register_wizard("slycat-apply-template", "Apply Template", require={"action":"edit", "context":"model"})
  context.register_wizard("slycat-reset-model", "Reset Model", require={"action":"edit", "context":"model"})
  context.register_wizard("slycat-info-model", "Model Details", require={"action":"info", "context":"model"})