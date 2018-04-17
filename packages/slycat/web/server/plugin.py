# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import cherrypy
import hashlib
import imp
import os
import traceback
import slycat.email

class Manager(object):
  """Manages server plugin modules."""
  def __init__(self):
    self._modules = []

    self.directories = {}
    self.markings = {}
    self.model_commands = {}
    self.models = {}
    self.page_bundles = {}
    self.pages = {}
    self.page_resources = {}
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
      slycat.email.send_error("slycat.web.server.plugin.py load", "Plugin module path must be absolute: %s" % plugin_path)
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
      slycat.email.send_error("slycat.web.server.plugin.py register_directory", "Directory type '%s' has already been registered." % type)
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
      slycat.email.send_error("slycat.web.server.plugin.py register_marking", "Marking type '%s' has already been registered." % type)
      raise Exception("Marking type '%s' has already been registered." % type)

    self.markings[type] = {"label":label, "badge":badge, "page-before":page_before, "page-after": page_after}
    cherrypy.log.error("Registered marking '%s'." % type)

  def register_page_bundle(self, type, content_type, paths):
    if type not in self.pages:
      slycat.email.send_error("slycat.web.server.plugin.py register_marking", "Unknown page type: %s." % type)
      raise Exception("Unknown page type: %s." % type)
    if type not in self.page_bundles:
      self.page_bundles[type] = {}

    cherrypy.log.error("Bundled page '%s' resources" % type)

    key_hash = hashlib.md5()
    key_hash.update(content_type)
    content = ""

    for path in paths:
      if not os.path.isabs(path):
        slycat.email.send_error("slycat.web.server.plugin.py register_page_bundle", "Bundle file '%s' must be an absolute path." % (path))
        raise Exception("Bundle file '%s' must be an absolute path." % (path))
      cherrypy.log.error("  %s" % path)
      cherrypy.engine.autoreload.files.add(path)
      resource_content = open(path, "rb").read()
      key_hash.update(resource_content)
      content += resource_content + "\n\n"

    key = key_hash.hexdigest()
    self.page_bundles[type][key] = (content_type, content)
    cherrypy.log.error("  as /resources/pages/%s/%s" % (type, key))

    return key

  def register_model_command(self, verb, type, command, handler):
    """Register a custom request handler.

    Parameters
    ----------
    verb: string, required
      The HTTP verb for the command, "GET", "POST", or "PUT".
    type: string, required
      Unique category for the command.  Typically, this would be a model, parser, or wizard type.
    command: string, required
      Unique command name.
    handler: callable, required
      Called with the database, model, verb, type, command, and optional keyword parameters to handle a matching client request.
    """
    if verb not in ["GET", "POST", "PUT"]:
      slycat.email.send_error("slycat.web.server.plugin.py register_model_command", "Not an allowed HTTP verb: %s" % verb)
      raise Exception("Not an allowed HTTP verb: %s" % verb)
    key = (verb, type, command)
    if key in self.model_commands:
      slycat.email.send_error("slycat.web.server.plugin.py register_model_command", "Command '%s %s %s' has already been registered." % (verb, type, command))
      raise Exception("Command '%s %s %s' has already been registered." % (verb, type, command))

    self.model_commands[key] = handler
    cherrypy.log.error("Registered custom command '%s %s %s'." % (verb, type, command))

  def register_page_resource(self, type, resource, path):
    """Register a custom resource associated with a page type.

    Parameters
    ----------
    type: string, required
      Unique identifier of an already-registered page type.
    resource: string, required
      Server endpoint to retrieve the resource.
    path: string, required
      Absolute filesystem path of the resource to be retrieved.
      The resource may be a single file, or a directory.
    """
    if type not in self.pages:
      slycat.email.send_error("slycat.web.server.plugin.py register_page_resource", "Unknown page type: %s." % type)
      raise Exception("Unknown page type: %s." % type)
    if type not in self.page_resources:
      self.page_resources[type] = {}
    if resource in self.page_resources[type]:
      slycat.email.send_error("slycat.web.server.plugin.py register_page_resource", "Resource '%s' has already been registered with page '%s'." % (resource, type))
      raise Exception("Resource '%s' has already been registered with page '%s'." % (resource, type))
    if not os.path.isabs(path):
      slycat.email.send_error("slycat.web.server.plugin.py register_page_resource", "Resource '%s' must have an absolute path." % (resource))
      raise Exception("Resource '%s' must have an absolute path." % (resource))
    if not os.path.exists(path):
      slycat.email.send_error("slycat.web.server.plugin.py register_page_resource", "Resource '%s' does not exist." % (resource))
      raise Exception("Resource '%s' does not exist." % (resource))
    if os.path.isdir(path):
      cherrypy.log.error("Registered page '%s' resources" % type)
      for file_path in sorted(os.listdir(path)):
        resource_path = os.path.join(resource, file_path)
        file_path = os.path.join(path, file_path)
        self.page_resources[type][resource_path] = file_path
        cherrypy.log.error("  %s" % file_path)
      cherrypy.log.error("  under /resources/pages/%s/%s" % (type, resource))
    else:
      self.page_resources[type][resource] = path
      cherrypy.log.error("Registered page '%s' resource" % type)
      cherrypy.log.error("  %s" % path)
      cherrypy.log.error("  as /resources/pages/%s/%s" % (type, resource))

  def register_model(self, type, finish, ptype=None):
    """Register a new model type.

    Parameters
    ----------
    type: string, required
      A unique identifier for the new model type.
    finish: callable, required
      Called to finish (perform computation on) a new instance of the model.
    ptype: string, optional
      A unique page type identifier to be used as the default interface when
      viewing the model.  Defaults to the same string as the model type.
    """
    if type in self.models:
      slycat.email.send_error("slycat.web.server.plugin.py register_model", "Model type '%s' has already been registered." % type)
      raise Exception("Model type '%s' has already been registered." % type)

    if ptype is None:
      ptype = type

    if not isinstance(ptype, basestring):
      slycat.email.send_error("slycat.web.server.plugin.py register_model", "Page type '%s' must be a string." % ptype)
      raise Exception("Page type '%s' must be a string." % ptype)

    self.models[type] = {"finish": finish, "ptype": ptype}
    cherrypy.log.error("Registered model '%s'." % type)

  def register_page(self, type, html):
    """Register a new page type.

    Parameters
    ----------
    type: string, required
      A unique identifier for the new page type.
    html: callable, required
      Called to generate an HTML representation of the page.
    """
    if type in self.pages:
      slycat.email.send_error("slycat.web.server.plugin.py register_page", "Page type '%s' has already been registered." % type)
      raise Exception("Page type '%s' has already been registered." % type)

    self.pages[type] = {"html": html}
    cherrypy.log.error("Registered page '%s'." % type)

  def register_parser(self, type, label, categories, parse):
    """Register a new parser type.

    Parameters
    ----------
    type: string, required
      A unique identifier for the new parser type.
    label: string, required
      Human readable label describing the parser.
    categories: list, required
      List of string categories describing the type of data this parser produces, for example "table".
    parse: callable, required
      Called with a database, model, input flag, list of file objects, list of
      artifact names, and optional keyword arguments.  Must parse the file and
      insert its data into the model as artifacts, returning True if
      successful, otherwise False.
    """
    if type in self.parsers:
      slycat.email.send_error("slycat.web.server.plugin.py register_parser", "Parser type '%s' has already been regiitered.")
      raise Exception("Parser type '%s' has already been registered." % type)
    self.parsers[type] = {"label": label, "categories": categories, "parse": parse}
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
      slycat.email.send_error("slycat.web.server.plugin.py register_password_check", "Password check type '%s' has already been registered.")
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
      slycat.email.send_error("slycat.web.server.plugin.py register_tool", "Tool '%s' has already been registered.")
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
      slycat.email.send_error("slycat.web.server.plugin.py register_wizard_resource", "Unknown wizard type: %s." % type)
      raise Exception("Unknown wizard type: %s." % type)
    if type not in self.wizard_resources:
      self.wizard_resources[type] = {}
    if resource in self.wizard_resources[type]:
      slycat.email.send_error("slycat.web.server.plugin.py register_wizard_resource", "Resource '%s' has already been registered with wizard '%s'." % (resource, type))
      raise Exception("Resource '%s' has already been registered with wizard '%s'." % (resource, type))
    if not os.path.isabs(path):
      slycat.email.send_error("slycat.web.server.plugin.py register_wizard_resource", "Resource '%s' must have an absolute path.")
      raise Exception("Resource '%s' must have an absolute path." % (path))
    if not os.path.exists(path):
      slycat.email.send_error("slycat.web.server.plugin.py register_wizard_resource", "Resource '%s' does not exist." % (path))
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
      slycat.email.send_error("slycat.web.server.plugin.py register_wizard", "Wizard '%s' has already been registered." % (type))
      raise Exception("Wizard '%s' has already been registered." % (type))
    if "action" not in require:
      slycat.email.send_error("slycat.web.server.plugin.py register_wizard", "Wizard '%s' must specify an action." % (type))
      raise Exception("Wizard '%s' must specify an action." % (type))
    if require["action"] not in ["create", "edit", "info", "delete"]:
      slycat.email.send_error("slycat.web.server.plugin.py register_wizard", "Wizard '%s' unknown action: %s." % (type, require["action"]))
      raise Exception("Wizard '%s' unknown action: %s." % (type, require["action"]))
    if "context" not in require:
      slycat.email.send_error("slycat.web.server.plugin.py register_wizard", "Wizard '%s' must specify a context." % (type))
      raise Exception("Wizard '%s' must specify a context." % (type))
    if require["context"] not in ["global", "project", "model"]:
      slycat.email.send_error("slycat.web.server.plugin.py register_wizard", "Wizard '%s' unknown context: %s." % (type, require["context"]))
      raise Exception("Wizard '%s' unknown context: %s." % (type, require["context"]))
    self.wizards[type] = {"label": label, "require": require}
    cherrypy.log.error("Registered wizard '%s'." % (type))

# Create a new, singleton instance of slycat.web.server.plugin.Manager()
manager = Manager()

