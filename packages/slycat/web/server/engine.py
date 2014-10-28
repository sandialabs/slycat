# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import ConfigParser
import grp
import json
import logging
import OpenSSL.SSL
import os
import pprint
import pwd
import re
import sys

import slycat.web.server.directory
import slycat.web.server.handlers
import slycat.web.server.plugin

class DropPrivilegesRotatingFileHandler(logging.handlers.RotatingFileHandler):
  """Custom logfile handler that ensures newly-created logfiles have a specific user and group."""
  def __init__(self, uid, gid, filename, mode='a', maxBytes=0, backupCount=0, encoding=None, delay=0):
    self.uid = uid
    self.gid = gid
    logging.handlers.RotatingFileHandler.__init__(self, filename, mode, maxBytes, backupCount, encoding, delay)

  def _open(self):
    file = logging.handlers.RotatingFileHandler._open(self)
    if self.uid is not None:
      os.fchown(file.fileno(), self.uid, -1)
    if self.gid is not None:
      os.fchown(file.fileno(), -1, self.gid)
    #print "log file:", file.name, self.uid, self.gid, os.fstat(file.fileno())
    return file

class SessionIdFilter(logging.Filter):
  """Python log filter to keep session ids out of logfiles."""
  def __init__(self):
    self._agent_pattern = re.compile("/agents/[^/]+/")
    self._remote_pattern = re.compile("/remotes/[^/]+/")

  def filter(self, record):
    record.msg = self._agent_pattern.sub("/agents/----/", record.msg)
    record.msg = self._remote_pattern.sub("/remotes/----/", record.msg)
    return True

def start(root_path, config_file):

  def abspath(path):
    if os.path.isabs(path):
      return path
    return os.path.join(root_path, path)

  configuration = {}
  config_file = abspath(config_file)
  if os.path.exists(config_file):
    cherrypy.engine.autoreload.files.add(config_file)
    parser = ConfigParser.SafeConfigParser()
    parser.read(config_file)
    configuration = {section : {key : eval(value) for key, value in parser.items(section)} for section in parser.sections()}

  # Allow both numeric and named uid and gid
  uid = configuration["slycat"]["uid"]
  if isinstance(uid, basestring):
    uid = pwd.getpwnam(uid).pw_uid

  gid = configuration["slycat"]["gid"]
  if isinstance(gid, basestring):
    gid = grp.getgrnam(gid).gr_gid

  # Configure loggers.
  if configuration["slycat"]["access-log"] != "-":
    cherrypy.log.access_log.handlers = []
    if configuration["slycat"]["access-log"] is not None:
      cherrypy.log.access_log.addHandler(DropPrivilegesRotatingFileHandler(uid, gid, configuration["slycat"]["access-log"], "a", configuration["slycat"]["access-log-size"], configuration["slycat"]["access-log-count"]))
  if configuration["slycat"]["error-log"] != "-":
    cherrypy.log.error_log.handlers = []
    if configuration["slycat"]["error-log"] is not None:
      cherrypy.log.error_log.addHandler(DropPrivilegesRotatingFileHandler(uid, gid, configuration["slycat"]["error-log"], "a", configuration["slycat"]["error-log-size"], configuration["slycat"]["error-log-count"]))

  cherrypy.log.access_log.handlers[-1].addFilter(SessionIdFilter())

  cherrypy.log("Server root path: %s" % root_path)

  if os.path.exists(config_file):
    cherrypy.log("Loaded configuration from %s" % config_file)

  for path in sys.path:
    cherrypy.log.error("PYTHONPATH: %s" % path)

  # Optionally generate a pidfile for startup scripts
  if configuration["slycat"]["pidfile"] is not None:
    cherrypy.process.plugins.PIDFile(cherrypy.engine, configuration["slycat"]["pidfile"]).subscribe()

  # Optionally drop privileges so we can safely bind to low port numbers ...
  if uid is not None and gid is not None and configuration["slycat"]["umask"] is not None:
    cherrypy.process.plugins.DropPrivileges(cherrypy.engine, uid=uid, gid=gid, umask=configuration["slycat"]["umask"]).subscribe()

  # Optionally daemonize our process ...
  if configuration["slycat"]["daemon"] == True:
    cherrypy.process.plugins.Daemonizer(cherrypy.engine, stdout=configuration["slycat"]["stdout-log"], stderr=configuration["slycat"]["stderr-log"]).subscribe()

  dispatcher = cherrypy.dispatch.RoutesDispatcher()

  dispatcher.connect("delete-model", "/models/:mid", slycat.web.server.handlers.delete_model, conditions={"method" : ["DELETE"]})
  dispatcher.connect("delete-project", "/projects/:pid", slycat.web.server.handlers.delete_project, conditions={"method" : ["DELETE"]})
  dispatcher.connect("get-agent-file", "/agents/:sid/file{path:.*}", slycat.web.server.handlers.get_agent_file, conditions={"method" : ["GET"]})
  dispatcher.connect("get-agent-image", "/agents/:sid/image{path:.*}", slycat.web.server.handlers.get_agent_image, conditions={"method" : ["GET"]})
  dispatcher.connect("get-agent-test", "/agent-test", slycat.web.server.handlers.get_agent_test, conditions={"method" : ["GET"]})
  dispatcher.connect("get-agent-video", "/agents/:sid/videos/:vsid", slycat.web.server.handlers.get_agent_video, conditions={"method" : ["GET"]})
  dispatcher.connect("get-agent-video-status", "/agents/:sid/videos/:vsid/status", slycat.web.server.handlers.get_agent_video_status, conditions={"method" : ["GET"]})
  dispatcher.connect("get-bookmark", "/bookmarks/:bid", slycat.web.server.handlers.get_bookmark, conditions={"method" : ["GET"]})
  dispatcher.connect("get-configuration-markings", "/configuration/markings", slycat.web.server.handlers.get_configuration_markings, conditions={"method" : ["GET"]})
  dispatcher.connect("get-configuration-model-wizards", "/configuration/model-wizards", slycat.web.server.handlers.get_configuration_model_wizards, conditions={"method" : ["GET"]})
  dispatcher.connect("get-configuration-support-email", "/configuration/support-email", slycat.web.server.handlers.get_configuration_support_email, conditions={"method" : ["GET"]})
  dispatcher.connect("get-configuration-version", "/configuration/version", slycat.web.server.handlers.get_configuration_version, conditions={"method" : ["GET"]})
  dispatcher.connect("get-home", "/", slycat.web.server.handlers.get_home, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-array-attribute-chunk", "/models/:mid/arraysets/:aid/arrays/:array/attributes/:attribute/chunk", slycat.web.server.handlers.get_model_array_attribute_chunk, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-array-attribute-statistics", "/models/:mid/arraysets/:aid/arrays/:array/attributes/:attribute/statistics", slycat.web.server.handlers.get_model_array_attribute_statistics, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-array-metadata", "/models/:mid/arraysets/:aid/arrays/:array/metadata", slycat.web.server.handlers.get_model_array_metadata, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-arrayset-metadata", "/models/:mid/arraysets/:aid/metadata", slycat.web.server.handlers.get_model_arrayset_metadata, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-arrayset", "/models/:mid/arraysets/:aid", slycat.web.server.handlers.get_model_arrayset, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-command", "/models/:mid/commands/:command", slycat.web.server.handlers.get_model_command, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-file", "/models/:mid/files/:aid", slycat.web.server.handlers.get_model_file, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model", "/models/:mid", slycat.web.server.handlers.get_model, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-resource", "/resources/models/:mtype/{resource:.*}", slycat.web.server.handlers.get_model_resource, conditions={"method" : ["GET"]})
  dispatcher.connect("get-models", "/models", slycat.web.server.handlers.get_models, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-table-chunk", "/models/:mid/tables/:aid/arrays/:array/chunk", slycat.web.server.handlers.get_model_table_chunk, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-table-metadata", "/models/:mid/tables/:aid/arrays/:array/metadata", slycat.web.server.handlers.get_model_table_metadata, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-table-sorted-indices", "/models/:mid/tables/:aid/arrays/:array/sorted-indices", slycat.web.server.handlers.get_model_table_sorted_indices, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-table-unsorted-indices", "/models/:mid/tables/:aid/arrays/:array/unsorted-indices", slycat.web.server.handlers.get_model_table_unsorted_indices, conditions={"method" : ["GET"]})
  dispatcher.connect("get-project-models", "/projects/:pid/models", slycat.web.server.handlers.get_project_models, conditions={"method" : ["GET"]})
  dispatcher.connect("get-project", "/projects/:pid", slycat.web.server.handlers.get_project, conditions={"method" : ["GET"]})
  dispatcher.connect("get-projects", "/projects", slycat.web.server.handlers.get_projects, conditions={"method" : ["GET"]})
  dispatcher.connect("get-remote-file", "/remotes/:sid/file{path:.*}", slycat.web.server.handlers.get_remote_file, conditions={"method" : ["GET"]})
  dispatcher.connect("get-user", "/users/:uid", slycat.web.server.handlers.get_user, conditions={"method" : ["GET"]})
  dispatcher.connect("post-agent-browse", "/agents/:sid/browse{path:.*}", slycat.web.server.handlers.post_agent_browse, conditions={"method" : ["POST"]})
  dispatcher.connect("post-agents", "/agents", slycat.web.server.handlers.post_agents, conditions={"method" : ["POST"]})
  dispatcher.connect("post-agent-videos", "/agents/:sid/videos", slycat.web.server.handlers.post_agent_videos, conditions={"method" : ["POST"]})
  dispatcher.connect("post-events", "/events/{event:.*}", slycat.web.server.handlers.post_events, conditions={"method" : ["POST"]})
  dispatcher.connect("post-model-finish", "/models/:mid/finish", slycat.web.server.handlers.post_model_finish, conditions={"method" : ["POST"]})
  dispatcher.connect("post-project-bookmarks", "/projects/:pid/bookmarks", slycat.web.server.handlers.post_project_bookmarks, conditions={"method" : ["POST"]})
  dispatcher.connect("post-project-models", "/projects/:pid/models", slycat.web.server.handlers.post_project_models, conditions={"method" : ["POST"]})
  dispatcher.connect("post-projects", "/projects", slycat.web.server.handlers.post_projects, conditions={"method" : ["POST"]})
  dispatcher.connect("post-remote-browse", "/remotes/:sid/browse{path:.*}", slycat.web.server.handlers.post_remote_browse, conditions={"method" : ["POST"]})
  dispatcher.connect("post-remotes", "/remotes", slycat.web.server.handlers.post_remotes, conditions={"method" : ["POST"]})
  dispatcher.connect("put-model-arrayset-array", "/models/:mid/arraysets/:name/arrays/:array", slycat.web.server.handlers.put_model_arrayset_array, conditions={"method" : ["PUT"]})
  dispatcher.connect("put-model-arrayset-data", "/models/:mid/arraysets/:name/data", slycat.web.server.handlers.put_model_arrayset_data, conditions={"method" : ["PUT"]})
  dispatcher.connect("put-model-arrayset", "/models/:mid/arraysets/:name", slycat.web.server.handlers.put_model_arrayset, conditions={"method" : ["PUT"]})
  dispatcher.connect("put-model-file", "/models/:mid/files/:name", slycat.web.server.handlers.put_model_file, conditions={"method" : ["PUT"]})
  dispatcher.connect("put-model-inputs", "/models/:mid/inputs", slycat.web.server.handlers.put_model_inputs, conditions={"method" : ["PUT"]})
  dispatcher.connect("put-model", "/models/:mid", slycat.web.server.handlers.put_model, conditions={"method" : ["PUT"]})
  dispatcher.connect("put-model-parameter", "/models/:mid/parameters/:name", slycat.web.server.handlers.put_model_parameter, conditions={"method" : ["PUT"]})
  dispatcher.connect("put-model-table", "/models/:mid/tables/:name", slycat.web.server.handlers.put_model_table, conditions={"method" : ["PUT"]})
  dispatcher.connect("put-project", "/projects/:pid", slycat.web.server.handlers.put_project, conditions={"method" : ["PUT"]})

  def log_configuration(tree, indent=""):
    for key, value in sorted(tree.items()):
      if isinstance(value, dict):
        cherrypy.log.error("%s%s:" % (indent, key))
        log_configuration(value, indent + "  ")
      else:
        if "password" in key.lower():
          value = "********"
        cherrypy.log.error("%s%s: %s" % (indent, key, value))
  log_configuration(configuration)

  # Setup our RESTful request dispatcher.
  if "/" not in configuration:
    configuration["/"] = {}
  configuration["/"]["request.dispatch"] = dispatcher

  # Generate absolute paths for static content directories.
  for section in configuration.values():
    if "tools.staticdir.dir" in section:
      section["tools.staticdir.dir"] = abspath(section["tools.staticdir.dir"])

  # We want fine-grained control over PyOpenSSL here.
  if "server.ssl_private_key" in configuration["global"] and "server.ssl_certificate" in configuration["global"]:
    cherrypy.server.ssl_context = OpenSSL.SSL.Context(OpenSSL.SSL.TLSv1_METHOD)
    cherrypy.server.ssl_context.use_privatekey_file(abspath(configuration["global"]["server.ssl_private_key"]))
    cherrypy.server.ssl_context.use_certificate_file(abspath(configuration["global"]["server.ssl_certificate"]))
    if "server.ssl_certificate_chain" in configuration["global"]:
      cherrypy.server.ssl_context.load_verify_locations(abspath(configuration["global"]["server.ssl_certificate_chain"]))
    if "ssl-ciphers" in configuration["slycat"]:
      cherrypy.server.ssl_context.set_cipher_list(":".join(configuration["slycat"]["ssl-ciphers"]))

  # Load plugin modules.
  manager = slycat.web.server.plugin.manager
  for item in configuration["slycat"]["plugins"]:
    manager.load(abspath(item))
  manager.register_plugins()

  # Sanity-check to ensure that we have a marking plugin for every allowed marking type.
  for allowed_marking in configuration["slycat"]["allowed-markings"]:
    if allowed_marking not in manager.markings.keys():
      raise Exception("No marking plugin for type: %s" % allowed_marking)

  # Start the web server.
  cherrypy.quickstart(None, "/", configuration)

