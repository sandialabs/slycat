# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import imp
import os
import traceback

class Manager(object):
  """Manages loading plugin modules."""
  def __init__(self):
    self._modules = []
  def load(self, directory):
    """Load a directory containing *.py files as plugin modules.

    Parameters
    ----------
    directory : string, required
      Path to a directory containing plugin modules.
    """
    try:
      cherrypy.log.error("Loading plugins from %s" % directory)
      plugin_names = [x[:-3] for x in os.listdir(directory) if x.endswith(".py")]
      for plugin_name in plugin_names:
        cherrypy.log.error("Loading plugin %s/%s" % (directory, plugin_name))
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
    return self._modules
