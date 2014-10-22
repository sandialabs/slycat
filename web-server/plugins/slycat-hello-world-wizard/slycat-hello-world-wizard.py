def register_slycat_plugin(context):
  """Called during startup when the plugin is loaded."""

  # Register our new wizard.
  context.register_model_wizard("hello-world", "basic-wizard", "Create Hello World Model")
