# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import imp
import os
import traceback

class Manager(object):
  """Manages server plugin modules."""
  def __init__(self):
    self._modules = []
    self._models = {}

  def load(self, directory):
    """Load a directory containing *.py files as plugin modules.

    Parameters
    ----------
    directory : string, required
      Path to a directory containing plugin modules.
    """
    try:
      cherrypy.log.error("Loading plugin modules from directory '%s'" % directory)
      plugin_names = [x[:-3] for x in os.listdir(directory) if x.endswith(".py")]
      for plugin_name in plugin_names:
        cherrypy.log.error("Loading plugin '%s'" % os.path.join(directory, plugin_name + ".py"))
        try:
          module_fp, module_pathname, module_description = imp.find_module(plugin_name, [directory])
          self._modules.append(imp.load_module(plugin_name, module_fp, module_pathname, module_description))
        except Exception as e:
          cherrypy.log.error(traceback.format_exc())
        finally:
          if module_fp:
            module_fp.close()
    except Exception as e:
      cherrypy.log.error(traceback.format_exc())

  @property
  def modules(self):
    """Returns a sequence of loaded plugin (literally: Python) modules."""
    return self._modules

  @property
  def models(self):
    """Returns a dict mapping model types to models."""
    return self._models

  def register_plugins(self):
    """Called to register plugins after all plugin modules have been loaded."""
    for module in self._modules:
      if hasattr(module, "register_slycat_plugin"):
        try:
          module.register_slycat_plugin(self)
        except Exception as e:
          import traceback
          cherrypy.log.error(traceback.format_exc())

  def register_model(self, type, finish, html):
    """Called when a plugin is loaded to register a new model type.

    Parameters
    ----------
    type : string, required
      A unique identifier for the new model type.
    finish : callback function, required
      Function that will be called to finish (perform computation on) a new instance of the model.
    html : callback function, required
      Function that will be called to generate an HTML representation of the model.
    """
    if type in self._models:
      raise Exception("Model type '%s' has already been registered." % type)

    self._models[type] = {"finish":finish, "html":html}
    cherrypy.log.error("Registered new model '%s'" % type)

# Create a new, singleton instance of slycat.web.server.plugin.Manager()
manager = Manager()

