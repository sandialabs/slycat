# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import hashlib
import imp
import os
import traceback

class Manager(object):
  """Manages server plugin modules."""
  def __init__(self):
    self._modules = []

    self._markings = {}
    self._models = {}
    self._model_commands = {}
    self._model_bundles = {}
    self._model_resources = {}
    self._model_wizards = {}
    self._model_wizard_resources = {}
    self._tools = {}

  def _load_directory(self, plugin_directory):
    try:
      cherrypy.log.error("Loading plugin modules from directory '%s'" % plugin_directory)
      plugin_paths = [x for x in os.listdir(plugin_directory) if x.endswith(".py")]
      for plugin_path in plugin_paths:
        self._load_module(os.path.join(plugin_directory, plugin_path))
    except Exception as e:
      cherrypy.log.error(traceback.format_exc())

  def _load_module(self, plugin_path):
    try:
      cherrypy.log.error("Loading plugin '%s'" % plugin_path)
      plugin_directory, plugin_name = os.path.split(plugin_path)
      module_fp, module_pathname, module_description = imp.find_module(plugin_name[:-3], [plugin_directory])
      self._modules.append(imp.load_module(plugin_name[:-3], module_fp, module_pathname, module_description))
      module_fp.close()
    except Exception as e:
      cherrypy.log.error(traceback.format_exc())

  def load(self, plugin_path):
    if not os.path.isabs(plugin_path):
      raise Exception("Plugin module path must be absolute: %s" % plugin_path)
    if os.path.isdir(plugin_path):
      self._load_directory(plugin_path)
    else:
      self._load_module(plugin_path)

  def register_plugins(self):
    """Called to register plugins after all plugin modules have been loaded."""
    for module in self._modules:
      if hasattr(module, "register_slycat_plugin"):
        try:
          module.register_slycat_plugin(self)
        except Exception as e:
          import traceback
          cherrypy.log.error(traceback.format_exc())

  @property
  def markings(self):
    """Return a dict mapping marking types to marking data."""
    return self._markings

  @property
  def models(self):
    """Return a dict mapping model types to models."""
    return self._models

  @property
  def model_commands(self):
    """Return a dict of dicts mapping custom requests to models."""
    return self._model_commands

  @property
  def model_bundles(self):
    """Return a dict of dicts mapping model types to bundles."""
    return self._model_bundles

  @property
  def model_resources(self):
    """Return a dict of dicts mapping model resources to filesystem paths."""
    return self._model_resources

  @property
  def model_wizards(self):
    """Return a dict of dicts mapping custom model-creation wizards to models."""
    return self._model_wizards

  @property
  def model_wizard_resources(self):
    """Return a dict of dicts mapping custom model-creation wizards to filesystem paths."""
    return self._model_wizard_resources

  def register_marking(self, type, label, badge, page_before=None, page_after=None):
    """Register a new marking type.

    Parameters
    ----------
    type : string, required
      A unique identifier for the new marking type.
    label : string, required
      Human-readable string used to represent the marking in the user interface.
    badge : string, required
      HTML representation used to display the marking as a "badge".  The HTML
      must contain everything needed to properly format the marking, including
      inline CSS styles.
    page_before : string, optional
      HTML representation used to display the marking at the top of an HTML page.
      If left unspecified, the badge representation will be used instead.
    page_after : string, optional
      HTML representation used to display the marking at the bottom of an HTML page.
      If left unspecified, the badge representation will be used instead.

    Note that the page_before and page_after markup need not be self-contained, i.e. they
    may be used together to define a "container" that encloses the page markup.
    """
    if type in self._markings:
      raise Exception("Marking type '%s' has already been registered." % type)

    self._markings[type] = {"label":label, "badge":badge, "page-before":page_before, "page-after": page_after}
    cherrypy.log.error("Registered marking '%s'." % type)

  def register_model(self, type, finish, html):
    """Register a new model type.

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
    cherrypy.log.error("Registered model '%s'." % type)

  def register_model_command(self, type, command, handler):
    """Register a custom request handler associcated with a model type.

    Parameters
    ----------
    type : string, required
      Unique identifier of an already-registered model type.
    command : string, required
      Unique-to-the model name of the request.
    handler : callback function, required
      Function that will be called to handle requests for the given model command.
    """
    if type not in self._models:
      raise Exception("Unknown model type: %s." % type)
    if type not in self._model_commands:
      self._model_commands[type] = {}
    if command in self._model_commands[type]:
      raise Exception("Command '%s' has already been registered with model '%s'." % (command, type))
    self._model_commands[type][command] = {"handler":handler}
    cherrypy.log.error("Registered model '%s' command '%s'." % (type, command))

  def register_model_bundle(self, type, content_type, paths):
    if type not in self._models:
      raise Exception("Unknown model type: %s." % type)
    if type not in self._model_bundles:
      self._model_bundles[type] = {}

    cherrypy.log.error("Bundled model '%s' resources" % type)

    key_hash = hashlib.md5()
    key_hash.update(content_type)
    content = ""

    for path in paths:
      if not os.path.isabs(path):
        raise Exception("Bundle file '%s' must be an absolute path." % (path))
      cherrypy.log.error("  %s" % path)
      cherrypy.engine.autoreload.files.add(path)
      resource_content = open(path, "rb").read()
      key_hash.update(resource_content)
      content += resource_content + "\n\n"

    key = key_hash.hexdigest()
    self._model_bundles[type][key] = (content_type, content)
    cherrypy.log.error("  as /resources/models/%s/%s" % (type, key))

    return key

  def register_model_resource(self, type, resource, path):
    """Register a custom resource associated with a model type.

    Parameters
    ----------
    type : string, required
      Unique identifier of an already-registered model type.
    resource : string, required
      Server endpoint to retrieve the resource.
    path : string, required
      Absolute filesystem path of the resource to be retrieved.
    """
    if type not in self._models:
      raise Exception("Unknown model type: %s." % type)
    if type not in self._model_resources:
      self._model_resources[type] = {}
    if resource in self._model_resources[type]:
      raise Exception("Resource '%s' has already been registered with model '%s'." % (resource, type))
    if not os.path.isabs(path):
      raise Exception("Resource '%s' must have an absolute path." % (resource))
    if not os.path.exists(path):
      raise Exception("Resource '%s' does not exist." % (resource))
    self._model_resources[type][resource] = path
    cherrypy.log.error("Registered model '%s' resource" % type)
    cherrypy.log.error("  %s" % path)
    cherrypy.log.error("  as /resources/models/%s/%s" % (type, resource))

  def register_model_wizard(self, type, label):
    """Register a wizard for creating new models.

    Parameters
    ----------
    type : string, required
      A unique identifier for the wizard.
    label : string, required
      Human-readable name for the wizard, displayed in the UI.
    """
    if type in self._model_wizards:
      raise Exception("Wizard '%s' has already been registered with model '%s'." % (wizard, type))
    self._model_wizards[type] = {"label":label}
    cherrypy.log.error("Registered model wizard '%s'." % (type))

  def register_model_wizard_resource(self, type, resource, path):
    """Register a custom resource associated with a model wizard.

    Parameters
    ----------
    type : string, required
      Unique identifier of an already-registered model wizard.
    resource : string, required
      Server endpoint to retrieve the resource.
    path : string, required
      Absolute filesystem path of the resource to be retrieved.
    """
    if type not in self._model_wizards:
      raise Exception("Unknown model wizard type: %s." % type)
    if type not in self._model_wizard_resources:
      self._model_wizard_resources[type] = {}
    if resource in self._model_wizard_resources[type]:
      raise Exception("Resource '%s' has already been registered with model wizard '%s'." % (resource, type))
    if not os.path.isabs(path):
      raise Exception("Resource '%s' must have an absolute path." % (resource))
    if not os.path.exists(path):
      raise Exception("Resource '%s' does not exist." % (resource))
    self._model_wizard_resources[type][resource] = path
    cherrypy.log.error("Registered model wizard '%s' resource" % type)
    cherrypy.log.error("  %s" % path)
    cherrypy.log.error("  as /resources/wizards/%s/%s" % (type, resource))

  def register_tool(self, name, hook_point, callable):
    """Register a new cherrypy tool.

    Parameters
    ----------
    name : string, required
      A unique identifier for the new tool.
    hook_point : string, required
      CherryPy hook point where the tool will be installed.
    callable : callable object, required
      Object that will be called for every client request.
      users.
    """
    if name in self._tools:
      raise Exception("Tool '%s' has already been registered." % name)
    self._tools[name] = (hook_point, callable)
    setattr(cherrypy.tools, name, cherrypy.Tool(hook_point, callable))
    cherrypy.log.error("Registered tool '%s' for '%s'." % (name, hook_point))

# Create a new, singleton instance of slycat.web.server.plugin.Manager()
manager = Manager()

