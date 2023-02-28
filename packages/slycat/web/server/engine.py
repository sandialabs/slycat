# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import cherrypy
import configparser
import datetime
import grp
import json
import logging
import os
import pprint
import pwd
import re
import sys

import slycat.web.server.cleanup
import slycat.web.server.handlers
import slycat.web.server.plugin


class SessionIdFilter(logging.Filter):
  """Python log filter to keep session ids out of logfiles."""
  def __init__(self):
    self._remote_pattern = re.compile("/remotes/[^/]+/")

  def filter(self, record):
    record.msg = self._remote_pattern.sub("/remotes/----/", record.msg)
    return True

def start(root_path, config_file):

  def abspath(path):
    if os.path.isabs(path):
      return path
    return os.path.join(root_path, path)

  # Load the configuration file.
  configuration = {}
  config_file = abspath(config_file)
  if not os.path.exists(config_file):
    cherrypy.log.error("slycat.web.server.engine.py start", "Configuration file %s does not exist." % config_file)
    raise Exception("Configuration file %s does not exist." % config_file)

  # below, simply tell engine to watch config file for potential reload, reloading may be ON or OFF
  cherrypy.engine.autoreload.files.add(config_file)
  parser = configparser.SafeConfigParser()
  parser.read(config_file)
  configuration = {section : {key : eval(value) for key, value in parser.items(section)} for section in parser.sections()}
  configuration["slycat-web-server"]["root-path"] = root_path

  # Configure loggers.
  if configuration["slycat-web-server"]["access-log"] != "-":
    cherrypy.log.access_log.handlers = []
    if configuration["slycat-web-server"]["access-log"] is not None:
      cherrypy.log.access_log.addHandler(logging.handlers.RotatingFileHandler(configuration["slycat-web-server"]["access-log"], maxBytes=configuration["slycat-web-server"]["access-log-size"], backupCount=configuration["slycat-web-server"]["access-log-count"]))
  if configuration["slycat-web-server"]["error-log"] != "-":
    cherrypy.log.error_log.handlers = []
    if configuration["slycat-web-server"]["error-log"] is not None:
      cherrypy.log.error_log.addHandler(logging.handlers.RotatingFileHandler(configuration["slycat-web-server"]["error-log"], maxBytes=configuration["slycat-web-server"]["error-log-size"], backupCount=configuration["slycat-web-server"]["error-log-count"]))

  cherrypy.log.access_log.handlers[-1].addFilter(SessionIdFilter())

  cherrypy.log("Server root path: %s" % root_path)

  if os.path.exists(config_file):
    cherrypy.log("Loaded configuration from %s" % config_file)

  for path in sys.path:
    cherrypy.log.error("PYTHONPATH: %s" % path)

  dispatcher = cherrypy.dispatch.RoutesDispatcher()

  dispatcher.connect("delete-model", "/models/:mid", slycat.web.server.handlers.delete_model, conditions={"method" : ["DELETE"]})
  dispatcher.connect("delete-project", "/projects/:pid", slycat.web.server.handlers.delete_project, conditions={"method" : ["DELETE"]})
  dispatcher.connect("delete-project-cache", "/projects/:pid/delete-cache", slycat.web.server.handlers.delete_project_cache, conditions={"method" : ["DELETE"]})
  dispatcher.connect("delete-project-cache-object", "/projects/:pid/cache/:key", slycat.web.server.handlers.delete_project_cache_object, conditions={"method" : ["DELETE"]})
  dispatcher.connect("delete-reference", "/references/:rid", slycat.web.server.handlers.delete_reference, conditions={"method" : ["DELETE"]})
  dispatcher.connect("delete-upload", "/uploads/:uid", slycat.web.server.handlers.delete_upload, conditions={"method" : ["DELETE"]})
  dispatcher.connect("delete-logout", "/logout", slycat.web.server.handlers.logout, conditions={"method" : ["DELETE"]})
  dispatcher.connect("delete-remote", "/remotes/:sid", slycat.web.server.handlers.delete_remote, conditions={"method" : ["DELETE"]})
  dispatcher.connect("delete-project-data", "/projects/data/:did", slycat.web.server.handlers.delete_project_data, conditions={"method" : ["DELETE"]})
  dispatcher.connect("delete-project-data-in-model", "/projects/data/:did/model/:mid", slycat.web.server.handlers.delete_project_data_in_model, conditions={"method" : ["DELETE"]})
  dispatcher.connect("delete-model-in-project-data", "/model/:mid/projects/data/:did", slycat.web.server.handlers.delete_model_in_project_data, conditions={"method" : ["DELETE"]})

  dispatcher.connect("get-time-series-names", "/remotes/:hostname/time_series_names/file{path:.*}", slycat.web.server.handlers.get_time_series_names, conditions={"method" : ["GET"]})
  dispatcher.connect("get-bookmark", "/bookmarks/:bid", slycat.web.server.handlers.get_bookmark, conditions={"method" : ["GET"]})
  dispatcher.connect("get-configuration-markings", "/configuration/markings", slycat.web.server.handlers.get_configuration_markings, conditions={"method" : ["GET"]})
  dispatcher.connect("get-selectable-configuration-markings", "/configuration/selectable-markings", slycat.web.server.handlers.get_selectable_configuration_markings, conditions={"method" : ["GET"]})
  dispatcher.connect("get-configuration-parsers", "/configuration/parsers", slycat.web.server.handlers.get_configuration_parsers, conditions={"method" : ["GET"]})
  dispatcher.connect("get-configuration-remote-hosts", "/configuration/remote-hosts", slycat.web.server.handlers.get_configuration_remote_hosts, conditions={"method" : ["GET"]})
  dispatcher.connect("get-configuration-smb-remote-hosts", "/configuration/smb-remote-hosts", slycat.web.server.handlers.get_configuration_smb_remote_hosts, conditions={"method" : ["GET"]})
  dispatcher.connect("get-configuration-support-email", "/configuration/support-email", slycat.web.server.handlers.get_configuration_support_email, conditions={"method" : ["GET"]})
  dispatcher.connect("get-configuration-injected-code", "/configuration/injected-code", slycat.web.server.handlers.get_configuration_injected_code, conditions={"method" : ["GET"]})
  dispatcher.connect("get-configuration-ga-tracking-id", "/configuration/ga-tracking-id", slycat.web.server.handlers.get_configuration_ga_tracking_id, conditions={"method" : ["GET"]})
  dispatcher.connect("get-configuration-version", "/configuration/version", slycat.web.server.handlers.get_configuration_version, conditions={"method" : ["GET"]})
  dispatcher.connect("get-configuration-wizards", "/configuration/wizards", slycat.web.server.handlers.get_configuration_wizards, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-array-attribute-chunk", "/models/:mid/arraysets/:aid/arrays/:array/attributes/:attribute/chunk", slycat.web.server.handlers.get_model_array_attribute_chunk, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-arrayset-data", "/models/:mid/arraysets/:aid/data", slycat.web.server.handlers.get_model_arrayset_data, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-arrayset-metadata", "/models/:mid/arraysets/:aid/metadata", slycat.web.server.handlers.get_model_arrayset_metadata, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-file", "/models/:mid/files/:aid", slycat.web.server.handlers.get_model_file, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model", "/models/:mid", slycat.web.server.handlers.get_model, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-parameter", "/models/:mid/parameters/:aid", slycat.web.server.handlers.get_model_parameter, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-table-chunk", "/models/:mid/tables/:aid/arrays/:array/chunk", slycat.web.server.handlers.get_model_table_chunk, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-table-metadata", "/models/:mid/tables/:aid/arrays/:array/metadata", slycat.web.server.handlers.get_model_table_metadata, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-table-sorted-indices", "/models/:mid/tables/:aid/arrays/:array/sorted-indices", slycat.web.server.handlers.get_model_table_sorted_indices, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-table-unsorted-indices", "/models/:mid/tables/:aid/arrays/:array/unsorted-indices", slycat.web.server.handlers.get_model_table_unsorted_indices, conditions={"method" : ["GET"]})
  dispatcher.connect("get-project-models", "/projects/:pid/models", slycat.web.server.handlers.get_project_models, conditions={"method" : ["GET"]})
  dispatcher.connect("get-project-references", "/projects/:pid/references", slycat.web.server.handlers.get_project_references, conditions={"method" : ["GET"]})
  dispatcher.connect("get-project", "/projects/:pid", slycat.web.server.handlers.get_project, conditions={"method" : ["GET"]})
  dispatcher.connect("get-project-cache-object", "/projects/:pid/cache/:key", slycat.web.server.handlers.get_project_cache_object, conditions={"method" : ["GET"]})
  dispatcher.connect("get-projects", "/projects", slycat.web.server.handlers.get_projects_list, conditions={"method" : ["GET"]})
  dispatcher.connect("get-projects-list", "/projects_list", slycat.web.server.handlers.get_projects_list, conditions={"method" : ["GET"]})
  dispatcher.connect("put-project-csv-data", "/projects/:pid/data/:file_key/parser/:parser/mid/:mid/aids/:aids", slycat.web.server.handlers.put_project_csv_data, conditions={"method": ["PUT"]})
  dispatcher.connect("get-project-data", "/projects/data/:did", slycat.web.server.handlers.get_project_data, conditions={"method": ["GET"]})
  dispatcher.connect("put-project-data-parameter", "/data/:did/aids/:aid", slycat.web.server.handlers.put_project_data_parameter, conditions={"method": ["PUT"]})
  dispatcher.connect("get-project-data-in-model", "/projects/data/model/:mid", slycat.web.server.handlers.get_project_data_in_model, conditions={"method": ["GET"]})
  dispatcher.connect("get-project-file-names", "/projects/:pid/name", slycat.web.server.handlers.get_project_file_names, conditions={"method": ["GET"]})
  dispatcher.connect("get-project-data-parameter", "/projects/data/:did/parameters/:param", slycat.web.server.handlers.get_project_data_parameter, conditions={"method": ["GET"]})
  dispatcher.connect("get-last-active-time", "/server/last_active_time", slycat.web.server.handlers.get_last_active_time, conditions={"method": ["GET"]})
  #TODO: scrub sid
  dispatcher.connect("get-remote-file", "/remotes/:hostname/file{path:.*}", slycat.web.server.handlers.get_remote_file, conditions={"method" : ["GET"]})

  dispatcher.connect("get-remote-image", "/remotes/:hostname/image{path:.*}", slycat.web.server.handlers.get_remote_image, conditions={"method" : ["GET"]})
  dispatcher.connect("get-remote-video", "/remotes/:hostname/videos/:vsid", slycat.web.server.handlers.get_remote_video, conditions={"method" : ["GET"]})
  dispatcher.connect("get-remotes", "/remotes/:hostname", slycat.web.server.handlers.get_remotes, conditions={"method" : ["GET"]})
  dispatcher.connect("get-remote-show-user-password", "/remotes/show/user-password", slycat.web.server.handlers.get_remote_show_user_password, conditions={"method": ["GET"]})

  dispatcher.connect("get-user", "/users/:uid/:time", slycat.web.server.handlers.get_user, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-statistics", "/get-model-statistics/:mid", slycat.web.server.handlers.get_model_statistics, conditions={"method" : ["GET"]})
  
  dispatcher.connect("model-command", "/models/:mid/commands/:type/:command", slycat.web.server.handlers.model_command, conditions={"method" : ["GET", "POST", "PUT"]})
  dispatcher.connect("post-model-arrayset-data", "/models/:mid/arraysets/:aid/data", slycat.web.server.handlers.post_model_arrayset_data, conditions={"method" : ["POST"]})
  dispatcher.connect("model-sensitive-command", "/models/:mid/sensitive/:type/:command", slycat.web.server.handlers.model_sensitive_command, conditions={"method" : ["POST"]})
  dispatcher.connect("post-events", "/events/{event:.*}", slycat.web.server.handlers.post_events, conditions={"method" : ["POST"]})
  dispatcher.connect("post-model-files", "/models/:mid/files", slycat.web.server.handlers.post_model_files, conditions={"method" : ["POST"]})
  dispatcher.connect("post-model-finish", "/models/:mid/finish", slycat.web.server.handlers.post_model_finish, conditions={"method" : ["POST"]})
  dispatcher.connect("post-project-bookmarks", "/projects/:pid/bookmarks", slycat.web.server.handlers.post_project_bookmarks, conditions={"method" : ["POST"]})
  dispatcher.connect("post-project-references", "/projects/:pid/references", slycat.web.server.handlers.post_project_references, conditions={"method" : ["POST"]})
  dispatcher.connect("post-project-models", "/projects/:pid/models",slycat.web.server.handlers.post_project_models, conditions={"method": ["POST"]})
  dispatcher.connect("post-log", "/log", slycat.web.server.handlers.post_log, conditions={"method" : ["POST"]})
  dispatcher.connect("post-projects", "/projects", slycat.web.server.handlers.post_projects, conditions={"method" : ["POST"]})

  dispatcher.connect("post-remote-browse", "/remotes/:hostname/browse{path:.*}", slycat.web.server.handlers.post_remote_browse, conditions={"method" : ["POST"]})
  dispatcher.connect("post-remotes", "/remotes", slycat.web.server.handlers.post_remotes, conditions={"method" : ["POST"]})
  dispatcher.connect("post-remotes-smb", "/remotes/smb", slycat.web.server.handlers.post_remotes_smb, conditions={"method" : ["POST"]})
  dispatcher.connect("post-smb-browse", "/smb/remotes/:hostname/browse{path:.*}", slycat.web.server.handlers.post_smb_browse, conditions={"method" : ["POST"]})



  dispatcher.connect("put-model-arrayset-array", "/models/:mid/arraysets/:aid/arrays/:array", slycat.web.server.handlers.put_model_arrayset_array, conditions={"method" : ["PUT"]})
  dispatcher.connect("put-model-arrayset-data", "/models/:mid/arraysets/:aid/data", slycat.web.server.handlers.put_model_arrayset_data, conditions={"method" : ["PUT"]})
  dispatcher.connect("put-model-arrayset", "/models/:mid/arraysets/:aid", slycat.web.server.handlers.put_model_arrayset, conditions={"method" : ["PUT"]})
  dispatcher.connect("put-model-inputs", "/models/:mid/inputs", slycat.web.server.handlers.put_model_inputs, conditions={"method" : ["PUT"]})
  dispatcher.connect("put-model", "/models/:mid", slycat.web.server.handlers.put_model, conditions={"method" : ["PUT"]})
  dispatcher.connect("put-model-parameter", "/models/:mid/parameters/:aid", slycat.web.server.handlers.put_model_parameter, conditions={"method" : ["PUT"]})
  dispatcher.connect("put-reference", "/references/:rid", slycat.web.server.handlers.put_reference, conditions={"method" : ["PUT"]})
  dispatcher.connect("put-project", "/projects/:pid", slycat.web.server.handlers.put_project, conditions={"method" : ["PUT"]})

  #TODO: scrub sid
  dispatcher.connect("get-session-status", "/remotes/:hostname/session-status", slycat.web.server.handlers.get_session_status, conditions={ "method": ["GET"] })
  dispatcher.connect("post-remote-launch", "/remotes/:hostname/launch", slycat.web.server.handlers.post_remote_launch, conditions={ "method": ["POST"] })
  dispatcher.connect("post-submit-batch", "/remotes/:hostname/submit-batch", slycat.web.server.handlers.post_submit_batch, conditions={ "method": ["POST"] })
  dispatcher.connect("get-checkjob", "/remotes/checkjob/:hostname/:jid", slycat.web.server.handlers.get_checkjob, conditions={ "method": ["GET"] })
  dispatcher.connect("delete-job", "/remotes/delete-job/:hostname/:jid", slycat.web.server.handlers.delete_job, conditions={ "method": ["DELETE"] })
  dispatcher.connect("get-job-output", "/remotes/get-job-output/:hostname/:jid/path{path:.*}", slycat.web.server.handlers.get_job_output, conditions={ "method": ["POST"] })
  dispatcher.connect("post-remote-command", "/remotes/:hostname/post-remote-command", slycat.web.server.handlers.post_remote_command, conditions={ "method": ["POST"] })
  dispatcher.connect("get-job-session-status", "/remotes/:hostname/:jid/get-remote-job-status", slycat.web.server.handlers.get_remote_job_status, conditions={"method": ["GET"]})

  dispatcher.connect("get-user-config", "/remotes/:hostname/get-user-config", slycat.web.server.handlers.get_user_config, conditions={ "method": ["GET"] })
  dispatcher.connect("get-runtime", "/remotes/:nodes/:tasks/:size/job-time", slycat.web.server.handlers.job_time, conditions={ "method": ["GET"] })

  dispatcher.connect("set-user-config", "/remotes/:hostname/set-user-config", slycat.web.server.handlers.set_user_config, conditions={ "method": ["POST"] })

  dispatcher.connect("post-uploads", "/uploads", slycat.web.server.handlers.post_uploads, conditions={"method" : ["POST"]})
  dispatcher.connect("put-upload-file-part", "/uploads/:uid/files/:fid/parts/:pid", slycat.web.server.handlers.put_upload_file_part, conditions={"method" : ["PUT"]})
  dispatcher.connect("post-upload-finished", "/uploads/:uid/finished", slycat.web.server.handlers.post_upload_finished, conditions={"method" : ["POST"]})
  
  dispatcher.connect("clean-project-data", "/clean/project-data", slycat.web.server.handlers.clean_project_data, conditions={"method" : ["GET"]})
  dispatcher.connect("clear-ssh-sessions", "/clear/ssh-sessions", slycat.web.server.handlers.clear_ssh_sessions, conditions={"method" : ["GET"]})
  dispatcher.connect("delete-model-parameter", "/delete-artifact/:mid/:aid", slycat.web.server.handlers.delete_model_parameter, conditions={"method" : ["DELETE"]})
  dispatcher.connect("login", "/login", slycat.web.server.handlers.login, conditions={"method" : ["POST"]})
  dispatcher.connect("openid-login", "/openid-login", slycat.web.server.handlers.open_id_authenticate, conditions={"method": ["GET"]})
  dispatcher.connect("get-root", "/", slycat.web.server.handlers.get_root, conditions={"method" : ["GET"]})


  def log_configuration(tree, indent=""):
    for key, value in sorted(tree.items()):
      if isinstance(value, dict):
        cherrypy.log.error("%s%s:" % (indent, key))
        log_configuration(value, indent + "  ")
      else:
        cherrypy.log.error("%s%s: %s" % (indent, key, value))
  log_configuration(configuration)

  # Setup global server parameters.
  configuration["global"] = {
    "engine.autoreload.on": configuration["slycat-web-server"]["autoreload"],
    "request.show_tracebacks": configuration["slycat-web-server"]["show-tracebacks"],
    "server.socket_host": configuration["slycat-web-server"]["socket-host"],
    "server.socket_port": configuration["slycat-web-server"]["socket-port"],
    "server.thread_pool": configuration["slycat-web-server"]["thread-pool"],
    }

  # Setup root server parameters.
  configuration["/"] = {}
  configuration["/"]["request.dispatch"] = dispatcher
  configuration["/"]["tools.caching.on"] = True
  configuration["/"]["tools.caching.delay"] = 3600
  configuration["/"]["tools.encode.on"] = True
  configuration["/"]["tools.encode.encoding"] = 'utf-8'
  configuration["/"]["tools.encode.text_only"] = False

  # wsgi: look at the auth below
  authentication = configuration["slycat-web-server"]["authentication"]["plugin"]
  configuration["/"]["tools.%s.on" % authentication] = True
  # configuration["/logout"]["tools.%s.on" % authentication] = False
  for key, value in list(configuration["slycat-web-server"]["authentication"]["kwargs"].items()):
    configuration["/"]["tools.%s.%s" % (authentication, key)] = value

  # Setup our static content directories.
  configuration["/login"] = {
    "tools.expires.force": True,
    "tools.expires.on": True,
    "tools.expires.secs": 3600,
    "tools.%s.on" % authentication : False,
    "tools.staticdir.dir": abspath("slycat-login"),
    "tools.staticdir.on": True,
    }
  configuration["/openid-login"] = {
    "tools.expires.force": True,
    "tools.expires.on": True,
    "tools.expires.secs": 3600,
    "tools.%s.on" % authentication : False,
    }
    
  # Load plugin modules.
  manager = slycat.web.server.plugin.manager
  for item in configuration["slycat-web-server"]["plugins"]:
    manager.load(abspath(item))
  manager.register_plugins()

  # Sanity-check to ensure that we have a marking plugin for every allowed marking type.
  for allowed_marking in configuration["slycat-web-server"]["allowed-markings"]:
    if allowed_marking not in list(manager.markings.keys()):
      cherrypy.log.error("slycat.web.server.engine.py start", "No marking plugin for type: %s" % allowed_marking)
      raise Exception("No marking plugin for type: %s" % allowed_marking)

  # Setup the requested directory plugin.
  # wsgi: this is the ldap fn to lookup a username and rtn/cache uid, name, email
  directory_type = configuration["slycat-web-server"]["directory"]["plugin"]
  if directory_type not in list(manager.directories.keys()):
    cherrypy.log.error("slycat.web.server.engine.py start", "No directory plugin for type: %s" % directory_type)
    raise Exception("No directory plugin for type: %s" % directory_type)
  directory_args = configuration["slycat-web-server"]["directory"].get("args", [])
  directory_kwargs = configuration["slycat-web-server"]["directory"].get("kwargs", {})
  manager.directories[directory_type]["init"](*directory_args, **directory_kwargs)
  configuration["slycat-web-server"]["directory"] = manager.directories[directory_type]["user"]

  # Expand remote host aliases.
  configuration["slycat-web-server"]["remote-hosts"] = {hostname: remote for remote in configuration["slycat-web-server"]["remote-hosts"] for hostname in remote.get("hostnames", [])}

  # wsgi: this just saves this dict in the slycat obj, no cherrypy stuff here
  slycat.web.server.config = configuration

  # Start all of our cleanup workers.
  cherrypy.engine.subscribe("start", slycat.web.server.cleanup.start, priority=80)

  # sets custom 4XX pages
  cherrypy.config.update({ 'error_page.404': os.path.join(root_path, "templates/slycat-404.html") })
  cherrypy.config.update({ 'error_page.401': os.path.join(root_path, "templates/slycat-401.html") })

  # Start the web server.
  cherrypy.quickstart(None, "", configuration)
  # wsgi: for actual wsgi - don't call quickstart just rtn config below
  #return configuration
