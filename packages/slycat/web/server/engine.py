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
import sys

import slycat.web.server.directory
import slycat.web.server.handlers
import slycat.web.server.marking

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

def start(config_file="config.ini"):
  configuration = {}

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

  if configuration["slycat"]["access-log"] != "-":
    cherrypy.log.access_log.handlers = []
    if configuration["slycat"]["access-log"] is not None:
      cherrypy.log.access_log.addHandler(DropPrivilegesRotatingFileHandler(uid, gid, configuration["slycat"]["access-log"], "a", configuration["slycat"]["access-log-size"], configuration["slycat"]["access-log-count"]))
  if configuration["slycat"]["error-log"] != "-":
    cherrypy.log.error_log.handlers = []
    if configuration["slycat"]["error-log"] is not None:
      cherrypy.log.error_log.addHandler(DropPrivilegesRotatingFileHandler(uid, gid, configuration["slycat"]["error-log"], "a", configuration["slycat"]["error-log-size"], configuration["slycat"]["error-log-count"]))

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

  dispatcher.connect("get-home", "/", slycat.web.server.handlers.get_home, conditions={"method" : ["GET"]})
  dispatcher.connect("post-projects", "/projects", slycat.web.server.handlers.post_projects, conditions={"method" : ["POST"]})
  dispatcher.connect("get-projects", "/projects", slycat.web.server.handlers.get_projects, conditions={"method" : ["GET"]})

  dispatcher.connect("get-project", "/projects/:pid", slycat.web.server.handlers.get_project, conditions={"method" : ["GET"]})
  dispatcher.connect("put-project", "/projects/:pid", slycat.web.server.handlers.put_project, conditions={"method" : ["PUT"]})
  dispatcher.connect("get-project-design", "/projects/:pid/design", slycat.web.server.handlers.get_project_design, conditions={"method" : ["GET"]})
  dispatcher.connect("post-project-models", "/projects/:pid/models", slycat.web.server.handlers.post_project_models, conditions={"method" : ["POST"]})
  dispatcher.connect("get-project-models", "/projects/:pid/models", slycat.web.server.handlers.get_project_models, conditions={"method" : ["GET"]})
  dispatcher.connect("post-project-bookmarks", "/projects/:pid/bookmarks", slycat.web.server.handlers.post_project_bookmarks, conditions={"method" : ["POST"]})
  dispatcher.connect("delete-project", "/projects/:pid", slycat.web.server.handlers.delete_project, conditions={"method" : ["DELETE"]})

  dispatcher.connect("get-model", "/models/:mid", slycat.web.server.handlers.get_model, conditions={"method" : ["GET"]})
  dispatcher.connect("put-model", "/models/:mid", slycat.web.server.handlers.put_model, conditions={"method" : ["PUT"]})
  dispatcher.connect("get-model-design", "/models/:mid/design", slycat.web.server.handlers.get_model_design, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-array-metadata", "/models/:mid/artifacts/:aid/array-metadata", slycat.web.server.handlers.get_model_array_metadata, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-array-chunk", "/models/:mid/artifacts/:aid/array-chunk", slycat.web.server.handlers.get_model_array_chunk, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-table-metadata", "/models/:mid/artifacts/:aid/table-metadata", slycat.web.server.handlers.get_model_table_metadata, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-table-chunk", "/models/:mid/artifacts/:aid/table-chunk", slycat.web.server.handlers.get_model_table_chunk, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-table-sorted-indices", "/models/:mid/artifacts/:aid/table-sorted-indices", slycat.web.server.handlers.get_model_table_sorted_indices, conditions={"method" : ["GET"]})
  dispatcher.connect("get-model-file", "/models/:mid/file/{name:.*}", slycat.web.server.handlers.get_model_file, conditions={"method" : ["GET"]})
  dispatcher.connect("delete-model", "/models/:mid", slycat.web.server.handlers.delete_model, conditions={"method" : ["DELETE"]})

  dispatcher.connect("get-bookmark", "/bookmarks/:bid", slycat.web.server.handlers.get_bookmark, conditions={"method" : ["GET"]})

  dispatcher.connect("get-user", "/users/:uid", slycat.web.server.handlers.get_user, conditions={"method" : ["GET"]})

  dispatcher.connect("post-workers", "/workers", slycat.web.server.handlers.post_workers, conditions={"method" : ["POST"]})
  dispatcher.connect("get-workers", "/workers", slycat.web.server.handlers.get_workers, conditions={"method" : ["GET"]})
  dispatcher.connect("get-worker", "/workers/:wid", slycat.web.server.handlers.get_worker, conditions={"method" : ["GET"]})
  dispatcher.connect("put-worker", "/workers/:wid", slycat.web.server.handlers.put_worker, conditions={"method" : ["PUT"]})
  dispatcher.connect("get-worker-table-chunker-metadata", "/workers/:wid/table-chunker/metadata", slycat.web.server.handlers.get_worker_endpoint("get_table_chunker_metadata"), conditions={"method" : ["GET"]})
  dispatcher.connect("get-worker-table-chunker-search", "/workers/:wid/table-chunker/search", slycat.web.server.handlers.get_worker_endpoint("get_table_chunker_search"), conditions={"method" : ["GET"]})
  dispatcher.connect("get-worker-table-chunker-chunk", "/workers/:wid/table-chunker/chunk", slycat.web.server.handlers.get_worker_endpoint("get_table_chunker_chunk"), conditions={"method" : ["GET"]})
  dispatcher.connect("put-worker-table-chunker-sort", "/workers/:wid/table-chunker/sort", slycat.web.server.handlers.put_worker_endpoint("put_table_chunker_sort"), conditions={"method" : ["PUT"]})
  dispatcher.connect("get-worker-model-browse", "/workers/:wid/model/browse", slycat.web.server.handlers.get_worker_endpoint("get_model_browse"), conditions={"method" : ["GET"]})
  dispatcher.connect("get-worker-model-table-columns", "/workers/:wid/model/table-columns", slycat.web.server.handlers.get_worker_endpoint("get_model_table_columns"), conditions={"method" : ["GET"]})
  dispatcher.connect("put-worker-model-remote-connection", "/workers/:wid/model/remote-connection", slycat.web.server.handlers.put_worker_endpoint("put_model_remote_connection"), conditions={"method" : ["PUT"]})
  dispatcher.connect("post-worker-model-copy-model-inputs", "/workers/:wid/model/copy-model-inputs", slycat.web.server.handlers.post_worker_endpoint("post_model_copy_model_inputs"), conditions={"method" : ["POST"]})
  dispatcher.connect("post-worker-model-set-parameter", "/workers/:wid/model/set-parameter", slycat.web.server.handlers.post_worker_endpoint("post_model_set_parameter"), conditions={"method" : ["POST"]})
  dispatcher.connect("post-worker-model-load-table", "/workers/:wid/model/load-table", slycat.web.server.handlers.post_worker_endpoint("post_model_load_table"), conditions={"method" : ["POST"]})
  dispatcher.connect("post-worker-model-load-remote-table", "/workers/:wid/model/load-remote-table", slycat.web.server.handlers.post_worker_endpoint("post_model_load_remote_table"), conditions={"method" : ["POST"]})
  dispatcher.connect("post-worker-model-start-table", "/workers/:wid/model/start-table", slycat.web.server.handlers.post_worker_endpoint("post_model_start_table"), conditions={"method" : ["POST"]})
  dispatcher.connect("post-worker-model-send-table-rows", "/workers/:wid/model/send-table-rows", slycat.web.server.handlers.post_worker_endpoint("post_model_send_table_rows"), conditions={"method" : ["POST"]})
  dispatcher.connect("post-worker-model-finish-table", "/workers/:wid/model/finish-table", slycat.web.server.handlers.post_worker_endpoint("post_model_finish_table"), conditions={"method" : ["POST"]})
  dispatcher.connect("post-worker-model-start-timeseries", "/workers/:wid/model/start-timeseries", slycat.web.server.handlers.post_worker_endpoint("post_model_start_timeseries"), conditions={"method" : ["POST"]})
  dispatcher.connect("post-worker-model-send-timeseries-rows", "/workers/:wid/model/send-timeseries-rows", slycat.web.server.handlers.post_worker_endpoint("post_model_send_timeseries_rows"), conditions={"method" : ["POST"]})
  dispatcher.connect("post-worker-model-finish-timeseries", "/workers/:wid/model/finish-timeseries", slycat.web.server.handlers.post_worker_endpoint("post_model_finish_timeseries"), conditions={"method" : ["POST"]})
  dispatcher.connect("post-worker-model-finish-model", "/workers/:wid/model/finish-model", slycat.web.server.handlers.post_worker_endpoint("post_model_finish_model"), conditions={"method" : ["POST"]})
  dispatcher.connect("delete-worker", "/workers/:wid", slycat.web.server.handlers.delete_worker, conditions={"method" : ["DELETE"]})

  dispatcher.connect("post-events", "/events/{event:.*}", slycat.web.server.handlers.post_events, conditions={"method" : ["POST"]})

  dispatcher.connect("get-test", "/test", slycat.web.server.handlers.get_test, conditions={"method" : ["GET"]})
  dispatcher.connect("get-test-canvas", "/test/canvas", slycat.web.server.handlers.get_test_canvas, conditions={"method" : ["GET"]})
  dispatcher.connect("get-test-grid", "/test/grid", slycat.web.server.handlers.get_test_grid, conditions={"method" : ["GET"]})
  dispatcher.connect("get-test-exception-404", "/test/exception/404", slycat.web.server.handlers.get_test_exception(404), conditions={"method" : ["GET"]})
  dispatcher.connect("get-test-exception-500", "/test/exception/500", slycat.web.server.handlers.get_test_exception(500), conditions={"method" : ["GET"]})
  dispatcher.connect("get-test-array-json", "/test/array/json", slycat.web.server.handlers.get_test_array_json, conditions={"method" : ["GET"]})
  dispatcher.connect("get-test-array-arraybuffer", "/test/array/arraybuffer", slycat.web.server.handlers.get_test_array_arraybuffer, conditions={"method" : ["GET"]})
  #dispatcher.connect("post-test-uploads", "/test/uploads", slycat.web.server.handlers.post_test_uploads, conditions={"method" : ["POST"]})

  configuration["/"]["request.dispatch"] = dispatcher

  if "server-resources" not in configuration["slycat"]:
    configuration["slycat"]["server-resources"] = os.getcwd()

  if "/js" not in configuration:
    configuration["/js"] = {}
  configuration["/js"].update({"tools.staticdir.on":True, "tools.staticdir.dir" : os.path.join(configuration["slycat"]["server-resources"], "js")})

  if "/style" not in configuration:
    configuration["/style"] = {}
  configuration["/style"].update({"tools.staticdir.on":True, "tools.staticdir.dir" : os.path.join(configuration["slycat"]["server-resources"], "style")})

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

  # We want fine-grained control over PyOpenSSL here ...
  if "server.ssl_private_key" in configuration["global"] and "server.ssl_certificate" in configuration["global"]:
    cherrypy.server.ssl_context = OpenSSL.SSL.Context(OpenSSL.SSL.TLSv1_METHOD)
    cherrypy.server.ssl_context.use_privatekey_file(configuration["global"]["server.ssl_private_key"])
    cherrypy.server.ssl_context.use_certificate_file(configuration["global"]["server.ssl_certificate"])
    if "server.ssl_certificate_chain" in configuration["global"]:
      cherrypy.server.ssl_context.load_verify_locations(configuration["global"]["server.ssl_certificate_chain"])
    if "ssl-ciphers" in configuration["slycat"]:
      cherrypy.server.ssl_context.set_cipher_list(":".join(configuration["slycat"]["ssl-ciphers"]))

  cherrypy.quickstart(None, "/", configuration)
