# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import imp
import os
import traceback

class plugin_manager(object):
  """Manages loading and registering plugins."""
  def __init__(self, log):
    self.log = log
    self.modules = []
    self.functions = {}
  def load(self, plugin_directory):
    try:
      self.log.debug("Loading plugins from %s", plugin_directory)
      plugin_names = [x[:-3] for x in os.listdir(plugin_directory) if x.endswith(".py")]
      for plugin_name in plugin_names:
        try:
          module_fp, module_pathname, module_description = imp.find_module(plugin_name, [plugin_directory])
          self.modules.append(imp.load_module(plugin_name, module_fp, module_pathname, module_description))
        except Exception as e:
          self.log.error(traceback.format_exc())
        finally:
          if module_fp:
            module_fp.close()
    except Exception as e:
      self.log.error(traceback.format_exc())
  def register_plugin_function(self, name, function, metadata = {}):
    if name in self.functions:
      raise Exception("Cannot register plugin function with duplicate name: %s" % name)
    self.functions[name] = (function, metadata)
    self.log.debug("Registered plugin function %s", name)

