class connection(object):
  pass

def get_connection():
  return connection()

def load_plugins(root):
  import imp
  import os

  def make_connection_method(function):
    def implementation(self, *arguments, **keywords):
      return function(self, *arguments, **keywords)
    implementation.__name__ = function.__name__
    implementation.__doc__ = function.__doc__
    return implementation

  def make_standalone_method(function):
    def implementation(*arguments, **keywords):
      return function(get_connection(), *arguments, **keywords)
    implementation.__name__ = function.__name__
    implementation.__doc__ = function.__doc__
    return implementation

  class plugin_context(object):
    def add_operator(self, name, function):
      setattr(connection, name, make_connection_method(function))
      globals()[name] = make_standalone_method(function)

  context = plugin_context()
  plugin_dir = os.path.join(os.path.dirname(os.path.realpath(root)), "plugins")
  plugin_names = [x[:-3] for x in os.listdir(plugin_dir) if x.endswith(".py")]
  for plugin_name in plugin_names:
    module_fp, module_pathname, module_description = imp.find_module(plugin_name, [plugin_dir])
    try:
      plugin = imp.load_module(plugin_name, module_fp, module_pathname, module_description)
      if hasattr(plugin, "register_client_plugin"):
        plugin.register_client_plugin(context)
    finally:
      if module_fp:
        module_fp.close()

load_plugins(__file__)

