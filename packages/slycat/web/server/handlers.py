# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

from __future__ import absolute_import

import cherrypy
import datetime
import hashlib
import itertools
import json
import logging.handlers
import numbers
import numpy
import os
import Queue
import re
import slycat.hdf5
import slycat.hyperchunks
import slycat.table
import slycat.web.server
import slycat.web.server.authentication
import slycat.web.server.database.couchdb
import slycat.web.server.hdf5
import slycat.web.server.plugin
import slycat.web.server.remote
import slycat.web.server.resource
import slycat.web.server.streaming
import slycat.web.server.template
import stat
import subprocess
import sys
import threading
import time
import uuid

def css_bundle():
  with css_bundle._lock:
    if css_bundle._bundle is None:
      css_bundle._bundle = slycat.web.server.resource.manager.add_bundle("text/css",
      [
        "css/namespaced-bootstrap.css",
        "css/font-awesome.css",
        "css/slycat.css",
      ])
      slycat.web.server.resource.manager.add_directory("fonts/bootstrap", "fonts/bootstrap")
      slycat.web.server.resource.manager.add_directory("fonts/font-awesome", "fonts/font-awesome")
      slycat.web.server.resource.manager.add_file("slycat-logo-navbar.png", "css/slycat-logo-navbar.png")
  return css_bundle._bundle
css_bundle._lock = threading.Lock()
css_bundle._bundle = None

def js_bundle():
  with js_bundle._lock:
    if js_bundle._bundle is None:
      js_bundle._bundle = slycat.web.server.resource.manager.add_bundle("text/javascript",
      [
        "js/curl.js",
        #"js/curl-debug.js", # Uncomment this to debug problems loading modules with curl
        "js/slycat-curl-config.js", # Load this immediately following curl to configure it.
        "js/uri.min.js",
        "js/jquery-2.1.1.min.js",
        "js/lodash.min.js",
        "js/slycat-lodash-wrap.js",
        "js/bootstrap.js",
        "js/knockout-3.2.0.js",
        "js/knockout.mapping.js",
        "js/knockout-projections.js",
        "js/knockstrap.js",
        "js/slycat-server-root.js",
        "js/slycat-bookmark-manager.js",
        "js/slycat-web-client.js",
        "js/slycat-dialog.js",
        "js/slycat-markings.js",
        "js/slycat-nag.js",
        "js/slycat-model-controls.js",
        "js/slycat-model-results.js",
        "js/slycat-changes-feed.js",
        "js/slycat-navbar.js",
        "js/slycat-local-browser.js",
        "js/slycat-remote-browser.js",
        "js/slycat-remote-controls.js",
        "js/slycat-remotes.js",
        "js/slycat-login-controls.js",
        "js/slycat-range-slider.js",
        "js/slycat-projects-main.js",
        "js/slycat-project-main.js",
        "js/slycat-model-main.js",
        "js/slycat-resizing-modals.js"
      ])
  return js_bundle._bundle
js_bundle._lock = threading.Lock()
js_bundle._bundle = None

def require_parameter(name):
  if name not in cherrypy.request.json:
    raise cherrypy.HTTPError("400 Missing %s parameter." % name)
  return cherrypy.request.json[name]

def require_boolean_parameter(name):
  value = require_parameter(name)
  if value != True and value != False:
    raise cherrypy.HTTPError("400 Parameter %s must be true or false." % name)
  return value

def get_home():
  raise cherrypy.HTTPRedirect(cherrypy.request.app.config["slycat-web-server"]["server-root"] + "projects")

def get_projects(_=None):
  accept = cherrypy.lib.cptools.accept(["text/html", "application/json"])
  cherrypy.response.headers["content-type"] = accept

  if accept == "text/html":
    context = {}
    context["slycat-server-root"] = cherrypy.request.app.config["slycat-web-server"]["server-root"]
    context["slycat-css-bundle"] = css_bundle()
    context["slycat-js-bundle"] = js_bundle()
    return slycat.web.server.template.render("slycat-projects.html", context)

  if accept == "application/json":
    database = slycat.web.server.database.couchdb.connect()
    projects = [project for project in database.scan("slycat/projects") if slycat.web.server.authentication.is_project_reader(project) or slycat.web.server.authentication.is_project_writer(project) or slycat.web.server.authentication.is_project_administrator(project) or slycat.web.server.authentication.is_server_administrator()]
    projects = sorted(projects, key = lambda x: x["created"], reverse=True)
    return json.dumps({"revision" : 0, "projects" : projects})

@cherrypy.tools.json_in(on = True)
@cherrypy.tools.json_out(on = True)
def post_projects():
  if "name" not in cherrypy.request.json:
    raise cherrypy.HTTPError("400 Missing project name.")

  database = slycat.web.server.database.couchdb.connect()
  pid, rev = database.save({
    "type" : "project",
    "acl" : {"administrators" : [{"user" : cherrypy.request.login}], "readers" : [], "writers" : []},
    "created" : datetime.datetime.utcnow().isoformat(),
    "creator" : cherrypy.request.login,
    "description" : cherrypy.request.json.get("description", ""),
    "name" : cherrypy.request.json["name"]
    })
  cherrypy.response.headers["location"] = "%s/projects/%s" % (cherrypy.request.base, pid)
  cherrypy.response.status = "201 Project created."
  return {"id" : pid}

def get_project(pid):
  accept = cherrypy.lib.cptools.accept(["text/html", "application/json"])
  cherrypy.response.headers["content-type"] = accept

  database = slycat.web.server.database.couchdb.connect()
  project = database.get("project", pid)
  slycat.web.server.authentication.require_project_reader(project)

  if accept == "application/json":
    return json.dumps(project)

  if accept == "text/html":
    models = [model for model in database.scan("slycat/project-models", startkey=pid, endkey=pid)]
    models = sorted(models, key=lambda x: x["created"], reverse=True)

    for model in models:
      model["marking-html"] = slycat.web.server.plugin.manager.markings[model["marking"]]["badge"]

    context = {}
    context["slycat-server-root"] = cherrypy.request.app.config["slycat-web-server"]["server-root"]
    context["slycat-css-bundle"] = css_bundle()
    context["slycat-js-bundle"] = js_bundle()
    context["slycat-project"] = project
    return slycat.web.server.template.render("slycat-project.html", context)

def get_remote_host_dict():
  remote_host_dict = cherrypy.request.app.config["slycat-web-server"]["remote-hosts"]
  remote_host_list = []
  for host in remote_host_dict:
    if "message" in remote_host_dict[host]:
      remote_host_list.append({"name": host, "message": remote_host_dict[host]["message"]})
    else:
      remote_host_list.append({"name": host})
  return remote_host_list

@cherrypy.tools.json_in(on = True)
@cherrypy.tools.json_out(on = True)
def put_project(pid):
  database = slycat.web.server.database.couchdb.connect()
  project = database.get("project", pid)
  slycat.web.server.authentication.require_project_writer(project)

  mutations = []
  if "acl" in cherrypy.request.json:
    slycat.web.server.authentication.require_project_administrator(project)
    if "administrators" not in cherrypy.request.json["acl"]:
      raise cherrypy.HTTPError("400 missing administrators")
    if "writers" not in cherrypy.request.json["acl"]:
      raise cherrypy.HTTPError("400 missing writers")
    if "readers" not in cherrypy.request.json["acl"]:
      raise cherrypy.HTTPError("400 missing readers")
    project["acl"] = cherrypy.request.json["acl"]

  if "name" in cherrypy.request.json:
    project["name"] = cherrypy.request.json["name"]

  if "description" in cherrypy.request.json:
    project["description"] = cherrypy.request.json["description"]

  database.save(project)

def array_cleanup_worker():
  while True:
    cleanup_arrays.queue.get()
    while True:
      try:
        database = slycat.web.server.database.couchdb.connect()
        cherrypy.log.error("Array cleanup started.")
        for file in database.view("slycat/hdf5-file-counts", group=True):
          if file.value == 0:
            slycat.web.server.hdf5.delete(file.key)
            database.delete(database[file.key])
        cherrypy.log.error("Array cleanup finished.")
        break
      except Exception as e:
        cherrypy.log.error("Array cleanup thread aiting for couchdb.")
        time.sleep(2)

def cleanup_arrays():
  cleanup_arrays.queue.put("cleanup")
cleanup_arrays.queue = Queue.Queue()
cleanup_arrays.thread = threading.Thread(name="array-cleanup", target=array_cleanup_worker)
cleanup_arrays.thread.daemon = True

def start_array_cleanup_worker():
  cleanup_arrays.thread.start()

def session_cleanup_worker():
  while True:
    try:
      database = slycat.web.server.database.couchdb.connect()
      cherrypy.log.error("Session cleanup started.")
      cutoff = (datetime.datetime.utcnow() - cherrypy.request.app.config["slycat"]["session-timeout"]).isoformat()
      for session in database.view("slycat/sessions", include_docs=True):
        if session.doc["created"] < cutoff:
          database.delete(session.doc)
      cherrypy.log.error("Session cleanup finished.")
      time.sleep(datetime.timedelta(minutes=60).total_seconds())
    except Exception as e:
      cherrypy.log.error("Session cleanup thread waiting for couchdb.")
      time.sleep(2)
session_cleanup_worker.thread = threading.Thread(name="session-cleanup", target=session_cleanup_worker)
session_cleanup_worker.thread.daemon = True

def start_session_cleanup_worker():
  session_cleanup_worker.thread.start()

def delete_project(pid):
  couchdb = slycat.web.server.database.couchdb.connect()
  project = couchdb.get("project", pid)
  slycat.web.server.authentication.require_project_administrator(project)

  for cache_object in couchdb.scan("slycat/project-cache-objects", startkey=pid, endkey=pid):
    couchdb.delete(cache_object)
  for reference in couchdb.scan("slycat/project-references", startkey=pid, endkey=pid):
    couchdb.delete(reference)
  for bookmark in couchdb.scan("slycat/project-bookmarks", startkey=pid, endkey=pid):
    couchdb.delete(bookmark)
  for model in couchdb.scan("slycat/project-models", startkey=pid, endkey=pid):
    couchdb.delete(model)
  couchdb.delete(project)
  cleanup_arrays()

  cherrypy.response.status = "204 Project deleted."

@cherrypy.tools.json_out(on = True)
def get_project_models(pid):
  database = slycat.web.server.database.couchdb.connect()
  project = database.get("project", pid)
  slycat.web.server.authentication.require_project_reader(project)

  models = [model for model in database.scan("slycat/project-models", startkey=pid, endkey=pid)]
  models = sorted(models, key=lambda x: x["created"], reverse=True)
  return models

@cherrypy.tools.json_out(on = True)
def get_project_references(pid):
  database = slycat.web.server.database.couchdb.connect()
  project = database.get("project", pid)
  slycat.web.server.authentication.require_project_reader(project)

  references = [reference for reference in database.scan("slycat/project-references", startkey=pid, endkey=pid)]
  references = sorted(references, key=lambda x: x["created"])
  return references

@cherrypy.tools.json_in(on = True)
@cherrypy.tools.json_out(on = True)
def post_project_models(pid):
  database = slycat.web.server.database.couchdb.connect()
  project = database.get("project", pid)
  slycat.web.server.authentication.require_project_writer(project)

  for key in ["model-type", "marking", "name"]:
    if key not in cherrypy.request.json:
      raise cherrypy.HTTPError("400 Missing required key: %s" % key)

  model_type = cherrypy.request.json["model-type"]
  allowed_model_types = slycat.web.server.plugin.manager.models.keys()
  if model_type not in allowed_model_types:
    raise cherrypy.HTTPError("400 Allowed model types: %s" % ", ".join(allowed_model_types))
  marking = cherrypy.request.json["marking"]

  if marking not in cherrypy.request.app.config["slycat-web-server"]["allowed-markings"]:
    raise cherrypy.HTTPError("400 Allowed marking types: %s" % ", ".join(cherrypy.request.app.config["slycat-web-server"]["allowed-markings"]))
  name = cherrypy.request.json["name"]
  description = cherrypy.request.json.get("description", "")
  mid = uuid.uuid4().hex

  model = {
    "_id" : mid,
    "type" : "model",
    "model-type" : model_type,
    "marking" : marking,
    "project" : pid,
    "created" : datetime.datetime.utcnow().isoformat(),
    "creator" : cherrypy.request.login,
    "name" : name,
    "description" : description,
    "artifact-types" : {},
    "input-artifacts" : [],
    "state" : "waiting",
    "result" : None,
    "started" : None,
    "finished" : None,
    "progress" : None,
    "message" : None,
    }
  database.save(model)

  cherrypy.response.headers["location"] = "%s/models/%s" % (cherrypy.request.base, mid)
  cherrypy.response.status = "201 Model created."
  return {"id" : mid}

@cherrypy.tools.json_in(on = True)
@cherrypy.tools.json_out(on = True)
def post_project_bookmarks(pid):
  database = slycat.web.server.database.couchdb.connect()
  project = database.get("project", pid)
  slycat.web.server.authentication.require_project_reader(project) # This is intentionally out-of-the-ordinary - we explicitly allow project *readers* to store bookmarks.

  content = json.dumps(cherrypy.request.json, separators=(",",":"), indent=None, sort_keys=True)
  bid = hashlib.md5(pid + content).hexdigest()

  try:
    doc = database[bid]
  except:
    doc = {
      "_id" : bid,
      "project" : pid,
      "type" : "bookmark"
    }
    database.save(doc)
    database.put_attachment(doc, filename="bookmark", content_type="application/json", content=content)

  cherrypy.response.headers["location"] = "%s/bookmarks/%s" % (cherrypy.request.base, bid)
  cherrypy.response.status = "201 Bookmark stored."
  return {"id" : bid}

@cherrypy.tools.json_in(on = True)
@cherrypy.tools.json_out(on = True)
def post_project_references(pid):
  database = slycat.web.server.database.couchdb.connect()
  project = database.get("project", pid)
  slycat.web.server.authentication.require_project_writer(project)

  for key in ["name"]:
    if key not in cherrypy.request.json:
      raise cherrypy.HTTPError("400 Missing required key: %s" % key)

  rid = uuid.uuid4().hex

  reference = {
    "_id" : rid,
    "type" : "reference",
    "project" : pid,
    "created" : datetime.datetime.utcnow().isoformat(),
    "creator" : cherrypy.request.login,
    "name" : cherrypy.request.json["name"],
    "model-type" : cherrypy.request.json.get("model-type", None),
    "mid" : cherrypy.request.json.get("mid", None),
    "bid" : cherrypy.request.json.get("bid", None),
    }
  database.save(reference)

  cherrypy.response.headers["location"] = "%s/references/%s" % (cherrypy.request.base, rid)
  cherrypy.response.status = "201 Reference created."
  return {"id" : rid}

def get_model(mid, **kwargs):
  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_reader(project)

  accept = cherrypy.lib.cptools.accept(media=["application/json", "text/html"])
  cherrypy.response.headers["content-type"] = accept

  if accept == "application/json":
    return json.dumps(model)

  elif accept == "text/html":
    mtype = model.get("model-type", None)

    # New code for rendering plugin models:
    marking = slycat.web.server.plugin.manager.markings[model["marking"]]

    context = {}
    context["slycat-server-root"] = cherrypy.request.app.config["slycat-web-server"]["server-root"]
    context["slycat-marking-before-html"] = marking["badge"] if marking["page-before"] is None else marking["page-before"]
    context["slycat-marking-after-html"] = marking["badge"] if marking["page-after"] is None else marking["page-after"]
    context["slycat-model"] = model
    context["slycat-project"] = project
    context["slycat-css-bundle"] = css_bundle()
    context["slycat-js-bundle"] = js_bundle()
    context["slycat-model-type"] = mtype

    if mtype in slycat.web.server.plugin.manager.models.keys():
      context["slycat-plugin-html"] = slycat.web.server.plugin.manager.models[mtype]["html"](database, model)
      if mtype in slycat.web.server.plugin.manager.model_bundles:
        context["slycat-plugin-css-bundles"] = [{"bundle":key} for key, (content_type, content) in slycat.web.server.plugin.manager.model_bundles[mtype].items() if content_type == "text/css"]
        context["slycat-plugin-js-bundles"] = [{"bundle":key} for key, (content_type, content) in slycat.web.server.plugin.manager.model_bundles[mtype].items() if content_type == "text/javascript"]
    else:
      context["slycat-plugin-html"] = """
      <div style="-webkit-flex:1;flex:1;display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;-webkit-justify-content:center;justify-content:center; text-align:center; font-size: 21px;">
        <p>No plugin available for this model.</p>
      </div>"""

    return slycat.web.server.template.render("slycat-model.html", context)

def get_model_command(mid, command, **kwargs):
  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_reader(project)

  if "model-type" in model and model["model-type"] in slycat.web.server.plugin.manager.model_commands.keys():
    if command in slycat.web.server.plugin.manager.model_commands[model["model-type"]]:
      return slycat.web.server.plugin.manager.model_commands[model["model-type"]][command]["handler"](database, model, command, **kwargs)
  raise cherrypy.HTTPError("400 Unknown command: %s" % command)

def get_model_resource(mtype, resource):
  if mtype in slycat.web.server.plugin.manager.model_bundles:
    if resource in slycat.web.server.plugin.manager.model_bundles[mtype]:
      content_type, content = slycat.web.server.plugin.manager.model_bundles[mtype][resource]
      cherrypy.response.headers["content-type"] = content_type
      return content
  if mtype in slycat.web.server.plugin.manager.model_resources:
    for model_resource, model_path in slycat.web.server.plugin.manager.model_resources[mtype].items():
      if model_resource == resource:
        return cherrypy.lib.static.serve_file(model_path)

  raise cherrypy.HTTPError("404")

def get_wizard_resource(wtype, resource):
  if wtype in slycat.web.server.plugin.manager.wizard_resources:
    for wizard_resource, wizard_path in slycat.web.server.plugin.manager.wizard_resources[wtype].items():
      if wizard_resource == resource:
        return cherrypy.lib.static.serve_file(wizard_path)

  raise cherrypy.HTTPError("404")

@cherrypy.tools.json_in(on = True)
def put_model(mid):
  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_writer(project)

  save_model = False
  for key, value in cherrypy.request.json.items():
    if key in ["name", "description", "state", "result", "progress", "message", "started", "finished", "marking"]:
      if value != model.get(key):
        model[key] = value
        save_model = True
    else:
      raise cherrypy.HTTPError("400 Unknown model parameter: %s" % key)

  if save_model:
    database.save(model)

def post_model_finish(mid):
  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_writer(project)

  if model["state"] != "waiting":
    raise cherrypy.HTTPError("400 Only waiting models can be finished.")
  if model["model-type"] not in slycat.web.server.plugin.manager.models.keys():
    raise cherrypy.HTTPError("500 Cannot finish unknown model type.")

  slycat.web.server.update_model(database, model, state="running", started = datetime.datetime.utcnow().isoformat(), progress = 0.0)
  if model["model-type"] in slycat.web.server.plugin.manager.models.keys():
    slycat.web.server.plugin.manager.models[model["model-type"]]["finish"](database, model)
  cherrypy.response.status = "202 Finishing model."

def put_model_file(mid, name, input=None, file=None):
  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_writer(project)

  if input is None:
    raise cherrypy.HTTPError("400 Required input parameter is missing.")
  input = True if input == "true" else False

  if file is None:
    raise cherrypy.HTTPError("400 Required file parameter is missing.")

  data = file.file.read()
  #filename = file.filename
  content_type = file.content_type

  slycat.web.server.put_model_file(database, model, name, data, content_type, input)

@cherrypy.tools.json_in(on = True)
def put_model_inputs(mid):
  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_writer(project)

  sid = cherrypy.request.json["sid"]
  source = database.get("model", sid)
  if source["project"] != model["project"]:
    raise cherrypy.HTTPError("400 Cannot duplicate a model from another project.")

  slycat.web.server.put_model_inputs(database, model, source)

def put_model_table(mid, name, input=None, file=None, sid=None, path=None):
  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_writer(project)

  if input is None:
    raise cherrypy.HTTPError("400 Required input parameter is missing.")
  input = True if input == "true" else False

  if file is not None and sid is None and path is None:
    data = file.file.read()
    filename = file.filename
  elif file is None and sid is not None and path is not None:
    with slycat.web.server.remote.get_session(sid) as session:
      filename = "%s@%s:%s" % (session.username, session.hostname, path)
      if stat.S_ISDIR(session.sftp.stat(path).st_mode):
        raise cherrypy.HTTPError("400 Cannot load directory %s." % filename)
      data = session.sftp.file(path).read()
  else:
    raise cherrypy.HTTPError("400 Must supply a file parameter, or sid and path parameters.")

  slycat.web.server.update_model(database, model, message="Loading table %s from %s." % (name, filename))
  try:
    array = slycat.table.parse(data)
  except:
    raise cherrypy.HTTPError("400 Could not parse file %s" % filename)

  storage = uuid.uuid4().hex
  with slycat.web.server.hdf5.lock:
    with slycat.web.server.hdf5.create(storage) as file:
      database.save({"_id" : storage, "type" : "hdf5"})
      model["artifact:%s" % name] = storage
      model["artifact-types"][name] = "hdf5"
      if input:
        model["input-artifacts"] = list(set(model["input-artifacts"] + [name]))
      database.save(model)
      arrayset = slycat.hdf5.ArraySet(file)
      arrayset.store_array(0, array)

@cherrypy.tools.json_in(on = True)
def put_model_parameter(mid, name):
  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_writer(project)

  value = require_parameter("value")
  input = require_boolean_parameter("input")

  slycat.web.server.put_model_parameter(database, model, name, value, input)

@cherrypy.tools.json_in(on = True)
def put_model_arrayset(mid, name):
  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_writer(project)

  input = require_boolean_parameter("input")

  slycat.web.server.put_model_arrayset(database, model, name, input)

@cherrypy.tools.json_in(on = True)
def put_model_arrayset_array(mid, name, array):
  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_writer(project)

  # Sanity-check inputs ...
  array_index = int(array)
  attributes = cherrypy.request.json["attributes"]
  dimensions = cherrypy.request.json["dimensions"]
  slycat.web.server.put_model_array(database, model, name, array_index, attributes, dimensions)

def put_model_arrayset_data(mid, name, hyperchunks, data, byteorder=None):
  # Validate inputs.
  try:
    hyperchunks = slycat.hyperchunks.parse(hyperchunks)
  except:
    raise cherrypy.HTTPError("400 Not a valid hyperchunks specification.")

  if byteorder is not None:
    if byteorder not in ["big", "little"]:
      raise cherrypy.HTTPError("400 optional byteorder argument must be big or little.")

  # Handle the request.
  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_writer(project)

  slycat.web.server.update_model(database, model, message="Storing data to array set %s." % (name))

  if byteorder is None:
    data = json.load(data.file)
    data_iterator = iter(data)

  with slycat.web.server.hdf5.lock:
    with slycat.web.server.hdf5.open(model["artifact:%s" % name], "r+") as file:
      hdf5_arrayset = slycat.hdf5.ArraySet(file)
      for array in slycat.hyperchunks.arrays(hyperchunks, hdf5_arrayset.array_count()):
        hdf5_array = hdf5_arrayset[array.index]
        for attribute in array.attributes(len(hdf5_array.attributes)):
          if not isinstance(attribute.expression, slycat.hyperchunks.grammar.AttributeIndex):
            raise cherrypy.HTTPError("400 Cannot assign data to computed attributes.")
          for hyperslice in attribute.hyperslices():
            cherrypy.log.error("Writing %s/%s/%s/%s" % (name, array.index, attribute.expression.index, hyperslice))

            # We have to convert our hyperslice into a shape with explicit extents so we can compute
            # how many bytes to extract from the input data.
            if hyperslice == (Ellipsis,):
              data_shape = [dimension["end"] - dimension["begin"] for dimension in hdf5_array.dimensions]
            else:
              data_shape = []
              for hyperslice_dimension, array_dimension in zip(hyperslice, hdf5_array.dimensions):
                if isinstance(hyperslice_dimension, numbers.Integral):
                  data_shape.append(1)
                elif isinstance(hyperslice_dimension, type(Ellipsis)):
                  data_shape.append(array_dimension["end"] - array_dimension["begin"])
                elif isinstance(hyperslice_dimension, slice):
                  # TODO: Handle step
                  start, stop, step = hyperslice_dimension.indices(array_dimension["end"] - array_dimension["begin"])
                  data_shape.append(stop - start)
                else:
                  raise ValueError("Unexpected hyperslice: %s" % hyperslice_dimension)

            # Convert data to an array ...
            data_type = slycat.hdf5.dtype(hdf5_array.attributes[attribute.expression.index]["type"])
            data_size = numpy.prod(data_shape)

            if byteorder is None:
              hyperslice_data = numpy.array(data_iterator.next(), dtype=data_type).reshape(data_shape)
            elif byteorder == sys.byteorder:
              hyperslice_data = numpy.fromfile(data.file, dtype=data_type, count=data_size).reshape(data_shape)
            else:
              raise NotImplementedError()

            hdf5_array.set_data(attribute.expression.index, hyperslice, hyperslice_data)


def delete_model(mid):
  couchdb = slycat.web.server.database.couchdb.connect()
  model = couchdb.get("model", mid)
  project = couchdb.get("project", model["project"])
  slycat.web.server.authentication.require_project_writer(project)

  couchdb.delete(model)
  cleanup_arrays()

  cherrypy.response.status = "204 Model deleted."

def delete_reference(rid):
  couchdb = slycat.web.server.database.couchdb.connect()
  reference = couchdb.get("reference", rid)
  project = couchdb.get("project", reference["project"])
  slycat.web.server.authentication.require_project_writer(project)

  couchdb.delete(reference)

  cherrypy.response.status = "204 Reference deleted."

def get_project_cache_object(pid, key):
  database = slycat.web.server.database.couchdb.connect()
  project = database.get("project", pid)
  slycat.web.server.authentication.require_project_reader(project)

  lookup = pid + "-" + key
  for cache_object in database.scan("slycat/project-key-cache-objects", startkey=lookup, endkey=lookup):
    cherrypy.response.headers["content-type"] = cache_object["_attachments"]["content"]["content_type"]
    return database.get_attachment(cache_object, "content")

  raise cherrypy.HTTPError(404)

def delete_project_cache_object(pid, key):
  couchdb = slycat.web.server.database.couchdb.connect()
  project = couchdb.get("project", pid)
  slycat.web.server.authentication.require_project_writer(project)

  lookup = pid + "-" + key
  for cache_object in couchdb.scan("slycat/project-key-cache-objects", startkey=lookup, endkey=lookup):
    couchdb.delete(cache_object)
    cherrypy.response.status = "204 Cache object deleted."
    return

  raise cherrypy.HTTPError(404)

def get_model_array_attribute_chunk(mid, aid, array, attribute, **arguments):
  try:
    attribute = int(attribute)
  except:
    raise cherrypy.HTTPError("400 Malformed attribute argument must be a zero-based integer attribute index.")

  try:
    ranges = [int(spec) for spec in arguments["ranges"].split(",")]
    i = iter(ranges)
    ranges = list(itertools.izip(i, i))
  except:
    raise cherrypy.HTTPError("400 Malformed ranges argument must be a comma separated collection of half-open index ranges.")

  byteorder = arguments.get("byteorder", None)
  if byteorder is not None:
    if byteorder not in ["little", "big"]:
      raise cherrypy.HTTPError("400 Malformed byteorder argument must be 'little' or 'big'.")
    accept = cherrypy.lib.cptools.accept(["application/octet-stream"])
  else:
    accept = cherrypy.lib.cptools.accept(["application/json"])
  cherrypy.response.headers["content-type"] = accept

  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_reader(project)

  artifact = model.get("artifact:%s" % aid, None)
  if artifact is None:
    raise cherrypy.HTTPError(404)
  artifact_type = model["artifact-types"][aid]
  if artifact_type not in ["hdf5"]:
    raise cherrypy.HTTPError("400 %s is not an array artifact." % aid)

  with slycat.web.server.hdf5.lock:
    with slycat.web.server.hdf5.open(artifact) as file:
      hdf5_arrayset = slycat.hdf5.ArraySet(file)
      hdf5_array = hdf5_arrayset[array]

      if not(0 <= attribute and attribute < len(hdf5_array.attributes)):
        raise cherrypy.HTTPError("400 Attribute argument out-of-range.")
      if len(ranges) != hdf5_array.ndim:
        raise cherrypy.HTTPError("400 Ranges argument doesn't contain the correct number of dimensions.")

      ranges = [(max(dimension["begin"], range[0]), min(dimension["end"], range[1])) for dimension, range in zip(hdf5_array.dimensions, ranges)]
      index = tuple([slice(begin, end) for begin, end in ranges])

      attribute_type =  hdf5_array.attributes[attribute]["type"]
      data = hdf5_array.get_data(attribute)[index]

      if byteorder is None:
        return json.dumps(data.tolist())
      else:
        if sys.byteorder != byteorder:
          return data.byteswap().tostring(order="C")
        else:
          return data.tostring(order="C")

@cherrypy.tools.json_out(on = True)
def get_model_arrayset_metadata(mid, name, **kwargs):
  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_reader(project)

  artifact = model.get("artifact:%s" % name, None)
  if artifact is None:
    raise cherrypy.HTTPError(404)
  artifact_type = model["artifact-types"][name]
  if artifact_type not in ["hdf5"]:
    raise cherrypy.HTTPError("400 %s is not an array artifact." % name)

  try:
    arrays = slycat.hyperchunks.parse(kwargs["arrays"]) if "arrays" in kwargs else None
  except:
    raise cherrypy.HTTPError("400 Not a valid hyperchunks specification.")

  try:
    statistics = slycat.hyperchunks.parse(kwargs["statistics"]) if "statistics" in kwargs else None
  except:
    raise cherrypy.HTTPError("400 Not a valid hyperchunks specification.")

  try:
    unique = slycat.hyperchunks.parse(kwargs["unique"]) if "unique" in kwargs else None
  except:
    raise cherrypy.HTTPError("400 Not a valid hyperchunks specification.")

  results = slycat.web.server.get_model_arrayset_metadata(database, model, name, arrays, statistics, unique)
  if "unique" in results:
    for unique in results["unique"]:
      unique["values"] = unique["values"].tolist()

  return results

def get_model_arrayset_data(mid, aid, hyperchunks, byteorder=None):
  #cherrypy.log.error("GET Model Arrayset Data: arrayset %s hyperchunks %s byteorder %s" % (aid, hyperchunks, byteorder))

  try:
    hyperchunks = slycat.hyperchunks.parse(hyperchunks)
  except:
    raise cherrypy.HTTPError("400 Not a valid hyperchunks specification.")

  if byteorder is not None:
    if byteorder not in ["big", "little"]:
      raise cherrypy.HTTPError("400 optional byteorder argument must be big or little.")
    accept = cherrypy.lib.cptools.accept(["application/octet-stream"])
  else:
    accept = cherrypy.lib.cptools.accept(["application/json"])
  cherrypy.response.headers["content-type"] = accept

  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_reader(project)

  artifact = model.get("artifact:%s" % aid, None)
  if artifact is None:
    raise cherrypy.HTTPError(404)
  artifact_type = model["artifact-types"][aid]
  if artifact_type not in ["hdf5"]:
    raise cherrypy.HTTPError("400 %s is not an array artifact." % aid)

  def mask_nans(array):
    """Convert an array containing nans into a masked array."""
    try:
      return numpy.ma.masked_where(numpy.isnan(array), array)
    except:
      return array

  def content():
    if byteorder is None:
      yield json.dumps([mask_nans(hyperslice).tolist() for hyperslice in slycat.web.server.get_model_arrayset_data(database, model, aid, hyperchunks)])
    else:
      for hyperslice in slycat.web.server.get_model_arrayset_data(database, model, aid, hyperchunks):
        if sys.byteorder != byteorder:
          yield hyperslice.byteswap().tostring(order="C")
        else:
          yield hyperslice.tostring(order="C")
  return content()
get_model_arrayset_data._cp_config = {"response.stream" : True}

def validate_table_rows(rows):
  try:
    rows = [spec.split("-") for spec in rows.split(",")]
    rows = [(int(spec[0]), int(spec[1]) if len(spec) == 2 else int(spec[0]) + 1) for spec in rows]
    rows = numpy.concatenate([numpy.arange(begin, end) for begin, end in rows])
    return rows
  except:
    raise cherrypy.HTTPError("400 Malformed rows argument must be a comma separated collection of row indices or half-open index ranges.")

  if numpy.any(rows < 0):
    raise cherrypy.HTTPError("400 Row values must be non-negative.")

  return rows

def validate_table_columns(columns):
  try:
    columns = [spec.split("-") for spec in columns.split(",")]
    columns = [(int(spec[0]), int(spec[1]) if len(spec) == 2 else int(spec[0]) + 1) for spec in columns]
    columns = numpy.concatenate([numpy.arange(begin, end) for begin, end in columns])
    columns = columns[columns >= 0]
    return columns
  except:
    raise cherrypy.HTTPError("400 Malformed columns argument must be a comma separated collection of column indices or half-open index ranges.")

  if numpy.any(columns < 0):
    raise cherrypy.HTTPError("400 Column values must be non-negative.")

  return columns

def validate_table_sort(sort):
  if sort is not None:
    try:
      sort = [spec.split(":") for spec in sort.split(",")]
      sort = [(column, order) for column, order in sort]
    except:
      raise cherrypy.HTTPError("400 Malformed order argument must be a comma separated collection of column:order tuples.")

    try:
      sort = [(int(column), order) for column, order in sort]
    except:
      raise cherrypy.HTTPError("400 Sort column must be an integer.")

    for column, order in sort:
      if column < 0:
        raise cherrypy.HTTPError("400 Sort column must be non-negative.")
      if order not in ["ascending", "descending"]:
        raise cherrypy.HTTPError("400 Sort-order must be 'ascending' or 'descending'.")

    if len(sort) != 1:
      raise cherrypy.HTTPError("400 Currently, only one column can be sorted.")

  return sort

def validate_table_byteorder(byteorder):
  if byteorder is not None:
    if byteorder not in ["little", "big"]:
      raise cherrypy.HTTPError("400 Malformed byteorder argument must be 'little' or 'big'.")
    accept = cherrypy.lib.cptools.accept(["application/octet-stream"])
  else:
    accept = cherrypy.lib.cptools.accept(["application/json"])
  cherrypy.response.headers["content-type"] = accept
  return byteorder

def get_table_sort_index(file, metadata, array_index, sort, index):
  sort_index = numpy.arange(metadata["row-count"])
  if sort is not None:
    sort_column, sort_order = sort[0]
    if index is not None and sort_column == metadata["column-count"]-1:
      pass # At this point, the sort index is already set from above
    else:
      index_key = "array/%s/index/%s" % (array_index, sort_column)
      if index_key not in file:
        #cherrypy.log.error("Caching array index for file %s array %s attribute %s" % (file.filename, array_index, sort_column))
        sort_index = numpy.argsort(slycat.hdf5.ArraySet(file)[array_index].get_data(sort_column)[...], kind="mergesort")
        file[index_key] = sort_index
      else:
        #cherrypy.log.error("Loading cached sort index.")
        sort_index = file[index_key][...]
    if sort_order == "descending":
      sort_index = sort_index[::-1]
  return sort_index

def get_table_metadata(file, array_index, index):
  """Return table-oriented metadata for a 1D array, plus an optional index column."""
  arrayset = slycat.hdf5.ArraySet(file)
  array = arrayset[array_index]

  if array.ndim != 1:
    raise cherrypy.HTTPError("400 Not a table (1D array) artifact.")

  dimensions = array.dimensions
  attributes = array.attributes
  statistics = [array.get_statistics(attribute) for attribute in range(len(attributes))]

  metadata = {
    "row-count" : dimensions[0]["end"] - dimensions[0]["begin"],
    "column-count" : len(attributes),
    "column-names" : [attribute["name"] for attribute in attributes],
    "column-types" : [attribute["type"] for attribute in attributes],
    "column-min" : [attribute["min"] for attribute in statistics],
    "column-max" : [attribute["max"] for attribute in statistics]
    }

  if index is not None:
    metadata["column-count"] += 1
    metadata["column-names"].append(index)
    metadata["column-types"].append("int64")
    metadata["column-min"].append(0)
    metadata["column-max"].append(metadata["row-count"] - 1)

  return metadata

@cherrypy.tools.json_out(on = True)
def get_model_table_metadata(mid, aid, array, index = None):
  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_reader(project)

  artifact = model.get("artifact:%s" % aid, None)
  if artifact is None:
    raise cherrypy.HTTPError(404)
  artifact_type = model["artifact-types"][aid]
  if artifact_type not in ["hdf5"]:
    raise cherrypy.HTTPError("400 %s is not an array artifact." % aid)

  with slycat.web.server.hdf5.lock:
    with slycat.web.server.hdf5.open(artifact, "r+") as file: # We have to open the file with writing enabled because the statistics cache may need to be updated.
      metadata = get_table_metadata(file, array, index)
  return metadata

@cherrypy.tools.json_out(on = True)
def get_model_table_chunk(mid, aid, array, rows=None, columns=None, index=None, sort=None):
  rows = validate_table_rows(rows)
  columns = validate_table_columns(columns)
  sort = validate_table_sort(sort)

  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_reader(project)

  artifact = model.get("artifact:%s" % aid, None)
  if artifact is None:
    raise cherrypy.HTTPError(404)
  artifact_type = model["artifact-types"][aid]
  if artifact_type not in ["hdf5"]:
    raise cherrypy.HTTPError("400 %s is not an array artifact." % aid)

  with slycat.web.server.hdf5.lock:
    with slycat.web.server.hdf5.open(artifact, mode="r+") as file:
      metadata = get_table_metadata(file, array, index)

      # Constrain end <= count along both dimensions
      rows = rows[rows < metadata["row-count"]]
      if numpy.any(columns >= metadata["column-count"]):
        raise cherrypy.HTTPError("400 Column out-of-range.")
      if sort is not None:
        for column, order in sort:
          if column >= metadata["column-count"]:
            raise cherrypy.HTTPError("400 Sort column out-of-range.")

      # Retrieve the data
      data = []
      sort_index = get_table_sort_index(file, metadata, array, sort, index)
      slice = sort_index[rows]
      slice_index = numpy.argsort(slice, kind="mergesort")
      slice_reverse_index = numpy.argsort(slice_index, kind="mergesort")
      for column in columns:
        type = metadata["column-types"][column]
        if index is not None and column == metadata["column-count"]-1:
          values = slice.tolist()
        else:
          values = slycat.hdf5.ArraySet(file)[array].get_data(column)[slice[slice_index].tolist()][slice_reverse_index].tolist()
          if type in ["float32", "float64"]:
            values = [None if numpy.isnan(value) else value for value in values]
        data.append(values)

      result = {
        "rows" : rows.tolist(),
        "columns" : columns.tolist(),
        "column-names" : [metadata["column-names"][column] for column in columns],
        "data" : data,
        "sort" : sort
        }

  return result

def get_model_table_sorted_indices(mid, aid, array, rows=None, index=None, sort=None, byteorder=None):
  rows = validate_table_rows(rows)
  sort = validate_table_sort(sort)
  byteorder = validate_table_byteorder(byteorder)

  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_reader(project)

  artifact = model.get("artifact:%s" % aid, None)
  if artifact is None:
    raise cherrypy.HTTPError(404)
  artifact_type = model["artifact-types"][aid]
  if artifact_type not in ["hdf5"]:
    raise cherrypy.HTTPError("400 %s is not an array artifact." % aid)

  with slycat.web.server.hdf5.lock:
    with slycat.web.server.hdf5.open(artifact, mode="r+") as file:
      metadata = get_table_metadata(file, array, index)

      # Constrain end <= count along both dimensions
      rows = rows[rows < metadata["row-count"]]
      if sort is not None:
        for column, order in sort:
          if column >= metadata["column-count"]:
            raise cherrypy.HTTPError("400 Sort column out-of-range.")

      # Retrieve the data ...
      sort_index = get_table_sort_index(file, metadata, array, sort, index)
      slice = numpy.argsort(sort_index, kind="mergesort")[rows].astype("int32")

  if byteorder is None:
    return json.dumps(slice.tolist())
  else:
    if sys.byteorder != byteorder:
      return slice.byteswap().tostring(order="C")
    else:
      return slice.tostring(order="C")

def get_model_table_unsorted_indices(mid, aid, array, rows=None, index=None, sort=None, byteorder=None):
  rows = validate_table_rows(rows)
  sort = validate_table_sort(sort)
  byteorder = validate_table_byteorder(byteorder)

  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_reader(project)

  artifact = model.get("artifact:%s" % aid, None)
  if artifact is None:
    raise cherrypy.HTTPError(404)
  artifact_type = model["artifact-types"][aid]
  if artifact_type not in ["hdf5"]:
    raise cherrypy.HTTPError("400 %s is not an array artifact." % aid)

  with slycat.web.server.hdf5.lock:
    with slycat.web.server.hdf5.open(artifact, mode="r+") as file:
      metadata = get_table_metadata(file, array, index)

      # Constrain end <= count along both dimensions
      rows = rows[rows < metadata["row-count"]]
      if sort is not None:
        for column, order in sort:
          if column >= metadata["column-count"]:
            raise cherrypy.HTTPError("400 Sort column out-of-range.")

      # Generate a database query
      sort_index = get_table_sort_index(file, metadata, array, sort, index)
      slice = sort_index[rows].astype("int32")

  if byteorder is None:
    return json.dumps(slice.tolist())
  else:
    if sys.byteorder != byteorder:
      return slice.byteswap().tostring(order="C")
    else:
      return slice.tostring(order="C")

def get_model_file(mid, aid):
  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_reader(project)

  artifact = model.get("artifact:%s" % aid, None)
  if artifact is None:
    raise cherrypy.HTTPError(404)
  artifact_type = model["artifact-types"][aid]
  if artifact_type != "file":
    raise cherrypy.HTTPError("400 %s is not a file artifact." % aid)
  fid = artifact

  cherrypy.response.headers["content-type"] = model["_attachments"][fid]["content_type"]
  return database.get_attachment(mid, fid)

@cherrypy.tools.json_out(on = True)
def get_model_parameter(mid, name):
  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_reader(project)

  return slycat.web.server.get_model_parameter(database, model, name)

def get_bookmark(bid):
  accept = cherrypy.lib.cptools.accept(media=["application/json"])

  database = slycat.web.server.database.couchdb.connect()
  bookmark = database.get("bookmark", bid)
  project = database.get("project", bookmark["project"])
  slycat.web.server.authentication.require_project_reader(project)

  cherrypy.response.headers["content-type"] = accept
  return database.get_attachment(bookmark, "bookmark")

@cherrypy.tools.json_out(on = True)
def get_user(uid):
  if uid == "-":
    uid = cherrypy.request.login
  user = cherrypy.request.app.config["slycat-web-server"]["directory"](uid)
  if user is None:
    raise cherrypy.HTTPError(404)
  # Add the uid to the record, since the caller may not know it.
  user["uid"] = uid
  return user

@cherrypy.tools.json_in(on = True)
@cherrypy.tools.json_out(on = True)
def post_remotes():
  username = cherrypy.request.json["username"]
  hostname = cherrypy.request.json["hostname"]
  password = cherrypy.request.json["password"]
  agent = cherrypy.request.json.get("agent", None)
  return {"sid": slycat.web.server.remote.create_session(hostname, username, password, agent)}

def delete_remote(sid):
  slycat.web.server.remote.delete_session(sid)
  cherrypy.response.status = "204 Remote deleted."

@cherrypy.tools.json_in(on = True)
@cherrypy.tools.json_out(on = True)
def post_remote_browse(sid, path):
  file_reject = re.compile(cherrypy.request.json.get("file-reject")) if "file-reject" in cherrypy.request.json else None
  file_allow = re.compile(cherrypy.request.json.get("file-allow")) if "file-allow" in cherrypy.request.json else None
  directory_reject = re.compile(cherrypy.request.json.get("directory-reject")) if "directory-reject" in cherrypy.request.json else None
  directory_allow = re.compile(cherrypy.request.json.get("directory-allow")) if "directory-allow" in cherrypy.request.json else None

  with slycat.web.server.remote.get_session(sid) as session:
    return session.browse(path, file_reject, file_allow, directory_reject, directory_allow)

def get_remote_file(sid, path, **kwargs):
  with slycat.web.server.remote.get_session(sid) as session:
    return session.get_file(path, **kwargs)

def get_remote_image(sid, path, **kwargs):
  with slycat.web.server.remote.get_session(sid) as session:
    return session.get_image(path, **kwargs)

@cherrypy.tools.json_in(on = True)
@cherrypy.tools.json_out(on = True)
def post_remote_videos(sid):
  if "content-type" not in cherrypy.request.json:
    raise cherrypy.HTTPError("400 Missing content-type.")
  if "images" not in cherrypy.request.json:
    raise cherrypy.HTTPError("400 Missing images.")

  with slycat.web.server.remote.get_session(sid) as session:
    return session.post_video(cherrypy.request.json["content-type"], cherrypy.request.json["images"])

@cherrypy.tools.json_out(on = True)
def get_remote_video_status(sid, vsid):
  with slycat.web.server.remote.get_session(sid) as session:
    return session.get_video_status(vsid)

def get_remote_video(sid, vsid):
  with slycat.web.server.remote.get_session(sid) as session:
    return session.get_video(vsid)

def post_events(event):
  # We don't actually have to do anything here, since the request is already logged.
  cherrypy.response.status = "204 Event logged."

@cherrypy.tools.json_out(on = True)
def get_configuration_markings():
  return [dict(marking.items() + [("type", key)]) for key, marking in slycat.web.server.plugin.manager.markings.items() if key in cherrypy.request.app.config["slycat-web-server"]["allowed-markings"]]

@cherrypy.tools.json_out(on = True)
def get_configuration_remote_hosts():
  remote_hosts = []
  for hostname, remote in cherrypy.request.app.config["slycat-web-server"]["remote-hosts"].items():
    agent = True if remote.get("agent", False) else False
    remote_hosts.append({"hostname": hostname, "agent": agent})
  return remote_hosts

@cherrypy.tools.json_out(on = True)
def get_configuration_support_email():
  return cherrypy.request.app.config["slycat-web-server"]["support-email"]

@cherrypy.tools.json_out(on = True)
def get_configuration_version():
  with get_configuration_version.lock:
    if not get_configuration_version.initialized:
      get_configuration_version.initialized = True
      try:
        get_configuration_version.commit = subprocess.Popen(["git", "rev-parse", "HEAD"], cwd=os.path.dirname(__file__), stdout=subprocess.PIPE).communicate()[0].strip()
      except:
        pass
  return {"version" : slycat.__version__, "commit" : get_configuration_version.commit}
get_configuration_version.lock = threading.Lock()
get_configuration_version.initialized = False
get_configuration_version.commit = None

@cherrypy.tools.json_out(on = True)
def get_configuration_wizards():
  return [dict([("type", type)] + wizard.items()) for type, wizard in slycat.web.server.plugin.manager.wizards.items()]

@cherrypy.tools.expires(on=True, force=True, secs=60 * 60 * 24 * 30)
def get_global_resource(resource):
  if resource in slycat.web.server.resource.manager.bundles:
    content_type, content = slycat.web.server.resource.manager.bundles[resource]
    cherrypy.response.headers["content-type"] = content_type
    return content
  if resource in slycat.web.server.resource.manager.files:
    return cherrypy.lib.static.serve_file(slycat.web.server.resource.manager.files[resource])
  raise cherrypy.HTTPError(404)

def get_tests_remote():
  context = {}
  context["slycat-server-root"] = cherrypy.request.app.config["slycat-web-server"]["server-root"]
  context["slycat-css-bundle"] = css_bundle()
  context["slycat-js-bundle"] = js_bundle()
  return slycat.web.server.template.render("slycat-test-remote.html", context)

def tests_request(*arguments, **keywords):
  cherrypy.log.error("Request: %s" % cherrypy.request.request_line)
  cherrypy.log.error("  Remote IP: %s" % cherrypy.request.remote.ip)
  cherrypy.log.error("  Remote Port: %s" % cherrypy.request.remote.port)
  cherrypy.log.error("  Remote Hostname: %s" % cherrypy.request.remote.name)
  cherrypy.log.error("  Scheme: %s" % cherrypy.request.scheme)
  for key, value in sorted(cherrypy.request.headers.items()):
    cherrypy.log.error("  Header: %s=%s" % (key, value))
  cherrypy.response.status = 200
