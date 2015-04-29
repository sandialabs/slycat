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

    self.directories = {}
    self.markings = {}
    self.model_bundles = {}
    self.model_commands = {}
    self.model_resources = {}
    self.models = {}
    self.parsers = {}
    self.password_checks = {}
    self.tools = {}
    self.wizard_resources = {}
    self.wizards = {}

  def _load_directory(self, plugin_directory):
    try:
      cherrypy.log.error("Loading plugin modules from directory '%s'" % plugin_directory)
      plugin_paths = [x for x in os.listdir(plugin_directory) if x.endswith(".py")]
      for plugin_path in sorted(plugin_paths):
        self._load_module(os.path.join(plugin_directory, plugin_path))
    except Exception as e:
      cherrypy.log.error(traceback.format_exc())

  def _load_module(self, plugin_path):
    try:
      cherrypy.log.error("Loading plugin '%s'" % plugin_path)
      plugin_directory, plugin_name = os.path.split(plugin_path)
      module_fp, module_pathname, module_description = imp.find_module(plugin_name[:-3], [plugin_directory])
      self._modules.append((plugin_name[:-3], imp.load_module(plugin_name[:-3], module_fp, module_pathname, module_description)))
      module_fp.close()
    except Exception as e:
      cherrypy.log.error(traceback.format_exc())

  def load(self, plugin_path):
    """Load plugin modules from a filesystem.

    If the the given path is a directory, loads all .py files in the directory
    (non-recursive).  Otherwise, assumes the path is a module and loads it.
    """
    if not os.path.isabs(plugin_path):
      raise Exception("Plugin module path must be absolute: %s" % plugin_path)
    if os.path.isdir(plugin_path):
      self._load_directory(plugin_path)
    else:
      self._load_module(plugin_path)

  def register_plugins(self):
    """Called to register plugins after all plugin modules have been loaded."""
    for module_name, module in sorted(self._modules):
      if hasattr(module, "register_slycat_plugin"):
        try:
          module.register_slycat_plugin(self)
        except Exception as e:
          import traceback
          cherrypy.log.error(traceback.format_exc())

  def register_directory(self, type, init, user):
    """Register a new directory type.

    Parameters
    ----------
    type: string, required
      A unique identifier for the new directory type.
    init: callable, required
      Called with parameters specified by an adminstrator in the server
      config.ini to initialize the directory.
    user: callable, required
      Called with a username to retrieve information about a user.  Must return
      a dictionary containing user metadata.
    """
    if type in self.directories:
      raise Exception("Directory type '%s' has already been registered." % type)

    self.directories[type] = {"init":init, "user":user}
    cherrypy.log.error("Registered directory '%s'." % type)

  def register_marking(self, type, label, badge, page_before=None, page_after=None):
    """Register a new marking type.

    Parameters
    ----------
    type: string, required
      A unique identifier for the new marking type.
    label: string, required
      Human-readable string used to represent the marking in the user interface.
    badge: string, required
      HTML representation used to display the marking as a "badge".  The HTML
      must contain everything needed to properly format the marking, including
      inline CSS styles.
    page_before: string, optional
      HTML representation used to display the marking at the top of an HTML page.
      If left unspecified, the badge representation will be used instead.
    page_after: string, optional
      HTML representation used to display the marking at the bottom of an HTML page.
      If left unspecified, the badge representation will be used instead.

    Note that the page_before and page_after markup need not be self-contained, i.e. they
    may be used together to define a "container" that encloses the page markup.
    """
    if type in self.markings:
      raise Exception("Marking type '%s' has already been registered." % type)

    self.markings[type] = {"label":label, "badge":badge, "page-before":page_before, "page-after": page_after}
    cherrypy.log.error("Registered marking '%s'." % type)

  def register_model_bundle(self, type, content_type, paths):
    if type not in self.models:
      raise Exception("Unknown model type: %s." % type)
    if type not in self.model_bundles:
      self.model_bundles[type] = {}

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
    self.model_bundles[type][key] = (content_type, content)
    cherrypy.log.error("  as /resources/models/%s/%s" % (type, key))

    return key

  def register_model_command(self, type, command, handler):
    """Register a custom request handler associcated with a model type.

    Parameters
    ----------
    type: string, required
      Unique identifier of an already-registered model type.
    command: string, required
      Unique-to-the model name of the request.
    handler: callable, required
      Called to handle requests for the given model command.
    """
    if type not in self.models:
      raise Exception("Unknown model type: %s." % type)
    if type not in self.model_commands:
      self.model_commands[type] = {}
    if command in self.model_commands[type]:
      raise Exception("Command '%s' has already been registered with model '%s'." % (command, type))
    self.model_commands[type][command] = {"handler":handler}
    cherrypy.log.error("Registered model '%s' command '%s'." % (type, command))

  def register_model_resource(self, type, resource, path):
    """Register a custom resource associated with a model type.

    Parameters
    ----------
    type: string, required
      Unique identifier of an already-registered model type.
    resource: string, required
      Server endpoint to retrieve the resource.
    path: string, required
      Absolute filesystem path of the resource to be retrieved.
      The resource may be a single file, or a directory.
    """
    if type not in self.models:
      raise Exception("Unknown model type: %s." % type)
    if type not in self.model_resources:
      self.model_resources[type] = {}
    if resource in self.model_resources[type]:
      raise Exception("Resource '%s' has already been registered with model '%s'." % (resource, type))
    if not os.path.isabs(path):
      raise Exception("Resource '%s' must have an absolute path." % (resource))
    if not os.path.exists(path):
      raise Exception("Resource '%s' does not exist." % (resource))
    if os.path.isdir(path):
      cherrypy.log.error("Registered model '%s' resources" % type)
      for file_path in sorted(os.listdir(path)):
        resource_path = os.path.join(resource, file_path)
        file_path = os.path.join(path, file_path)
        self.model_resources[type][resource_path] = file_path
        cherrypy.log.error("  %s" % file_path)
      cherrypy.log.error("  under /resources/models/%s/%s" % (type, resource))
    else:
      self.model_resources[type][resource] = path
      cherrypy.log.error("Registered model '%s' resource" % type)
      cherrypy.log.error("  %s" % path)
      cherrypy.log.error("  as /resources/models/%s/%s" % (type, resource))

  def register_model(self, type, finish, html):
    """Register a new model type.

    Parameters
    ----------
    type: string, required
      A unique identifier for the new model type.
    finish: callable, required
      Called to finish (perform computation on) a new instance of the model.
    html: callable, required
      Called to generate an HTML representation of the model.
    """
    if type in self.models:
      raise Exception("Model type '%s' has already been registered." % type)

    self.models[type] = {"finish": finish, "html": html}
    cherrypy.log.error("Registered model '%s'." % type)

  def register_parser(self, type, data_type, validate, parse):
    """Register a new parser type.

    Parameters
    ----------
    type: string, required
      A unique identifier for the new parser type.
    data_type: string, required
      String category describing the type of data this parser produces, for example "table".
    validate: callable, required
      Called with a file object to determine whether it can be parsed with this parser.  Must
      return True or False.
    parse: callable, required
      Called with a database, model, file object, and optional keyword
      arguments.  Must parse the file and insert its data into the model as
      artifacts, returning True if successful, otherwise False.
    """
    if type in self.parsers:
      raise Exception("Parser type '%s' has already been registered." % type)
    self.parsers[type] = {"data-type": data_type, "validate": validate, "parse": parse}
    cherrypy.log.error("Registered parser '%s'." % type)

  def register_password_check(self, type, check):
    """Register a new password check function.

    Parameters
    ----------
    type: string, required
      A unique identifier for the new check type.
    check: callable, required
      Called with a realm, username, and password plus optional keyword
      arguments. Must return a (success, groups) tuple, where success is True
      if authentication succeeded, and groups is a (possibly empty) list of
        groups to which the user belongs.
    """
    if type in self.password_checks:
      raise Exception("Password check type '%s' has already been registered." % type)

    self.password_checks[type] = check
    cherrypy.log.error("Registered password_check '%s'." % type)

  def register_tool(self, name, hook_point, callable):
    """Register a new cherrypy tool.

    Parameters
    ----------
    name: string, required
      A unique identifier for the new tool.
    hook_point: string, required
      CherryPy hook point where the tool will be installed.
    callable: callable object, required
      Called for every client request.
    """
    if name in self.tools:
      raise Exception("Tool '%s' has already been registered." % name)
    self.tools[name] = (hook_point, callable)
    setattr(cherrypy.tools, name, cherrypy.Tool(hook_point, callable))
    cherrypy.log.error("Registered tool '%s' for '%s'." % (name, hook_point))

  def register_wizard_resource(self, type, resource, path):
    """Register a custom resource associated with a wizard.

    Parameters
    ----------
    type: string, required
      Unique identifier of an already-registered wizard.
    resource: string, required
      Server endpoint to retrieve the resource.
    path: string, required
      Absolute filesystem path of the resource to be retrieved.
    """
    if type not in self.wizards:
      raise Exception("Unknown wizard type: %s." % type)
    if type not in self.wizard_resources:
      self.wizard_resources[type] = {}
    if resource in self.wizard_resources[type]:
      raise Exception("Resource '%s' has already been registered with wizard '%s'." % (resource, type))
    if not os.path.isabs(path):
      raise Exception("Resource '%s' must have an absolute path." % (path))
    if not os.path.exists(path):
      raise Exception("Resource '%s' does not exist." % (path))
    self.wizard_resources[type][resource] = path
    cherrypy.log.error("Registered wizard '%s' resource" % type)
    cherrypy.log.error("  %s" % path)
    cherrypy.log.error("  as /resources/wizards/%s/%s" % (type, resource))

  def register_wizard(self, type, label, require):
    """Register a wizard for creating new entities.

    Parameters
    ----------
    type: string, required
      A unique identifier for the wizard.
    label: string, required
      Human-readable name for the wizard, displayed in the UI.
    require: dict, required
      Requirements in order to use the wizard.  Supported requirements
      include:

      * "action": "create" - the wizard will be used to create new objects.
      * "action": "edit" - the wizard will be used to edit existing objects.
      * "action": "delete" - the wizard will be used to delete existing objects.
      * "context": "global" - the wizard does not require any resources to run.
      * "context": "project" - the wizard requires a project to run.
      * "context": "model" - the wizard requires a model to run.
      * "model-type":[list of model types] - a model matching one of the given types is required to run the wizard.

    """
    if type in self.wizards:
      raise Exception("Wizard '%s' has already been registered." % (type))
    if "action" not in require:
      raise Exception("Wizard '%s' must specify an action." % (type))
    if require["action"] not in ["create", "edit", "delete"]:
      raise Exception("Wizard '%s' unknown action: %s." % (type, require["action"]))
    if "context" not in require:
      raise Exception("Wizard '%s' must specify a context." % (type))
    if require["context"] not in ["global", "project", "model"]:
      raise Exception("Wizard '%s' unknown context: %s." % (type, require["context"]))
    self.wizards[type] = {"label": label, "require": require}
    cherrypy.log.error("Registered wizard '%s'." % (type))

# Create a new, singleton instance of slycat.web.server.plugin.Manager()
manager = Manager()

