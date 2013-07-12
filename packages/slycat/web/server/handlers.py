# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

from __future__ import absolute_import

import base64
import cherrypy
import cStringIO as StringIO
import datetime
import hashlib
import json
import logging.handlers
import multiprocessing
import optparse
import os
import pprint
import Queue
import subprocess
import sys
import slycat.web.server
import slycat.web.server.authentication
import slycat.web.server.database.couchdb
import slycat.web.server.database.scidb
import slycat.web.server.ssh
import slycat.web.server.template
import slycat.web.server.timer
import slycat.web.server.worker
import slycat.web.server.worker.model.cca3
import slycat.web.server.worker.model.timeseries
import slycat.web.server.worker.model.generic
import slycat.web.server.worker.chunker.array
import slycat.web.server.worker.chunker.table
import slycat.web.server.worker.timer
import threading
import traceback
import uuid

def get_context():
  """Helper function that populates a default context object for use expanding HTML templates."""
  context = {}
  context["server-root"] = cherrypy.request.app.config["slycat"]["server-root"]
  context["security"] = cherrypy.request.security
  context["is-server-administrator"] = slycat.web.server.authentication.is_server_administrator()
  context["stylesheets"] = {"path" : path for path in cherrypy.request.app.config["slycat"]["stylesheets"]}

  marking = cherrypy.request.app.config["slycat"]["marking"]
  context["marking-types"] = [{"type" : type, "label" : marking.label(type)} for type in marking.types()]
  return context

def is_deleted(entity):
  """Identify objects that have been marked for deletion."""
  return "deleted" in entity and entity["deleted"] == "true"

def hide_deleted(entity):
  """Treat objects that have been marked for deletion as if they don't exist."""
  if is_deleted(entity):
    raise cherrypy.HTTPError("404 Entity marked for deletion.")

def get_home():
  raise cherrypy.HTTPRedirect(cherrypy.request.app.config["slycat"]["projects-redirect"])

def get_projects():
  accept = cherrypy.lib.cptools.accept(["text/html", "application/json"])
  cherrypy.response.headers["content-type"] = accept

  database = slycat.web.server.database.couchdb.connect()
  projects = [project for project in database.scan("slycat/projects") if slycat.web.server.authentication.is_project_reader(project) or slycat.web.server.authentication.is_project_writer(project) or slycat.web.server.authentication.is_project_administrator(project) or slycat.web.server.authentication.is_server_administrator()]
  projects = [project for project in projects if not is_deleted(project)]
  projects = sorted(projects, key = lambda x: x["created"], reverse=True)

  if accept == "text/html":
    context = get_context()
    context["projects"] = projects
    return slycat.web.server.template.render("projects.html", context)

  if accept == "application/json":
    return json.dumps(projects)

@cherrypy.tools.json_in(on = True)
@cherrypy.tools.json_out(on = True)
def post_projects():
  database = slycat.web.server.database.couchdb.connect()
  pid, rev = database.save({
    "type" : "project",
    "acl" : {"administrators" : [{"user" : cherrypy.request.security["user"]}], "readers" : [], "writers" : []},
    "created" : datetime.datetime.utcnow().isoformat(),
    "creator" : cherrypy.request.security["user"],
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

  models = [model for model in database.scan("slycat/project-models", startkey=pid, endkey=pid)]
  models = sorted(models, key=lambda x: x["created"], reverse=True)

  marking = cherrypy.request.app.config["slycat"]["marking"]
  for model in models:
    model["marking-html"] = marking.html(model["marking"])

  if accept == "text/html":
    context = get_context()
    context.update(project)
    context["models"] = models
    context["is-project-administrator"] = slycat.web.server.authentication.is_project_administrator(project)
    context["acl-json"] = json.dumps(project["acl"])
    context["if-remote-hosts"] = len(cherrypy.request.app.config["slycat"]["remote-hosts"])
    context["remote-hosts"] = [{"name" : host} for host in cherrypy.request.app.config["slycat"]["remote-hosts"]]
    context["new-model-name"] = "Model-%s" % (len(models) + 1)

    return slycat.web.server.template.render("project.html", context)

  if accept == "application/json":
    return json.dumps(project)

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

cleanup_array_queue = Queue.Queue()
def cleanup_array_worker():
  while True:
    cleanup_array_queue.get()
    cherrypy.log.error("Array cleanup started.")
    couchdb = slycat.web.server.database.couchdb.connect()
    scidb = slycat.web.server.database.scidb.connect()
    for array in couchdb.view("slycat/array-counts", group=True):
      if array.value == 0:
        scidb.execute("aql", "drop array %s" % array.key, ignore_errors=True)
        couchdb.delete(couchdb[array.key])
    cherrypy.log.error("Array cleanup finished.")
thread = threading.Thread(name="Cleanup arrays", target=cleanup_array_worker)
thread.daemon = True
thread.start()

def cleanup_arrays():
  cleanup_array_queue.put("cleanup")

def delete_project(pid):
  couchdb = slycat.web.server.database.couchdb.connect()
  project = couchdb.get("project", pid)
  slycat.web.server.authentication.require_project_administrator(project)

  for bookmark in couchdb.scan("slycat/project-bookmarks", startkey=pid, endkey=pid):
    couchdb.delete(bookmark)
  for model in couchdb.scan("slycat/project-models", startkey=pid, endkey=pid):
    couchdb.delete(model)
  couchdb.delete(project)
  cleanup_arrays()

  cherrypy.response.status = "204 Project deleted."

def get_project_design(pid):
  database = slycat.web.server.database.couchdb.connect()
  project = database.get("project", pid)
  slycat.web.server.authentication.require_project_reader(project)
  context = get_context()
  context.update(project)
  context["project-design"] = json.dumps(project, indent=2, sort_keys=True)
  return slycat.web.server.template.render("project-design.html", context)

@cherrypy.tools.json_out(on = True)
def get_project_models(pid):
  database = slycat.web.server.database.couchdb.connect()
  project = database.get("project", pid)
  slycat.web.server.authentication.require_project_reader(project)

  models = [model for model in database.scan("slycat/project-models", startkey=pid, endkey=pid)]
  models = sorted(models, key=lambda x: x["created"], reverse=True)
  return models

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
  marking = cherrypy.request.json["marking"]
  if marking not in cherrypy.request.app.config["slycat"]["marking"].types():
    raise cherrypy.HTTPError("400 Allowed marking types: %s" % ", ".join(["'%s'" % type for type in cherrypy.request.app.config["slycat"]["marking"].types()]))
  name = cherrypy.request.json["name"]
  description = cherrypy.request.json.get("description", "")
  mid = uuid.uuid4().hex

  if model_type == "generic":
    wid = pool.start_worker(slycat.web.server.worker.model.generic.implementation(cherrypy.request.security, pid, mid, name, marking, description))
  elif model_type == "cca3":
    wid = pool.start_worker(slycat.web.server.worker.model.cca3.implementation(cherrypy.request.security, pid, mid, name, marking, description))
  elif model_type == "timeseries":
    wid = pool.start_worker(slycat.web.server.worker.model.timeseries.implementation(cherrypy.request.security, pid, mid, name, marking, description))
  else:
    raise cherrypy.HTTPError("400 Unknown model type: %s" % cherrypy.request.json["model-type"])

  cherrypy.response.status = "202 Model scheduled for creation."
  return {"id" : mid, "wid" : wid}

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
    model_count = len(list(database.view("slycat/project-models", startkey=project["_id"], endkey=project["_id"])))

    context = get_context()
    context["full-project"] = project
    context.update(model)
    context["is-project-administrator"] = slycat.web.server.authentication.is_project_administrator(project)
    context["new-model-name"] = "Model-%s" % (model_count + 1)

    marking = cherrypy.request.app.config["slycat"]["marking"]
    context["marking-html"] = marking.html(model["marking"])

    if "model-type" in model and model["model-type"] == "timeseries":
      context["cluster-type"] = model["artifact:cluster-type"] if "artifact:cluster-type" in model else "null"
      context["cluster-bin-type"] = model["artifact:cluster-bin-type"] if "artifact:cluster-bin-type" in model else "null"
      context["cluster-bin-count"] = model["artifact:cluster-bin-count"] if "artifact:cluster-bin-count" in model else "null"
      return slycat.web.server.template.render("model-timeseries.html", context)

    if "model-type" in model and model["model-type"] == "cca3":
      context["input-columns"] = model["artifact:input-columns"] if "artifact:input-columns" in model else "null"
      context["output-columns"] = model["artifact:output-columns"] if "artifact:output-columns" in model else "null"
      context["index-column"] = model["artifact:index-column"] if "artifact:index-column" in model else "null"
      context["scale-inputs"] = json.dumps(model["artifact:scale-inputs"]) if "artifact:scale-inputs" in model else "null"
      context["input-tables"] = model["artifact:input-tables"] if "artifact:input-tables" in model else "null"
      context["statistics"] = database.get_attachment(model, model["artifact:statistics"]).read() if "artifact:statistics" in model else "null"
      context["x-canonical-variables"] = database.get_attachment(model, model["artifact:x-canonical-variables"]).read() if "artifact:x-canonical-variables" in model else "null"
      context["x-structure-correlation"] = database.get_attachment(model, model["artifact:x-structure-correlation"]).read() if "artifact:x-structure-correlation" in model else "null"
      context["y-canonical-variables"] = database.get_attachment(model, model["artifact:y-canonical-variables"]).read() if "artifact:y-canonical-variables" in model else "null"
      context["y-structure-correlation"] = database.get_attachment(model, model["artifact:y-structure-correlation"]).read() if "artifact:y-structure-correlation" in model else "null"
      return slycat.web.server.template.render("model-cca3.html", context)

    return slycat.web.server.template.render("model-generic.html", context)

@cherrypy.tools.json_in(on = True)
@cherrypy.tools.json_out(on = True)
def put_model(mid):
  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_writer(project)

  if "name" in cherrypy.request.json:
    model["name"] = cherrypy.request.json["name"]

  if "description" in cherrypy.request.json:
    model["description"] = cherrypy.request.json["description"]

  database.save(model)

def delete_model(mid):
  couchdb = slycat.web.server.database.couchdb.connect()
  model = couchdb.get("model", mid)
  project = couchdb.get("project", model["project"])
  slycat.web.server.authentication.require_project_writer(project)

  scidb = slycat.web.server.database.scidb.connect()
  couchdb.delete(model)
  cleanup_arrays()

  cherrypy.response.status = "204 Model deleted."

def get_model_design(mid):
  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_reader(project)
  context = get_context()
  context["full-project"] = project
  context.update(model)
  context["model-design"] = json.dumps(model, indent=2, sort_keys=True)

  marking = cherrypy.request.app.config["slycat"]["marking"]
  context["marking-html"] = marking.html(model["marking"])

  return slycat.web.server.template.render("model-design.html", context)

def get_model_file(mid, name):
  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_reader(project)

  key = "artifact:%s" % name
  if key not in model:
    raise cherrypy.HTTPError(404)
  fid = model[key]

  cherrypy.response.headers["content-type"] = model["_attachments"][fid]["content_type"]
  return database.get_attachment(mid, fid)

pool = slycat.web.server.worker.pool

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
  user = cherrypy.request.app.config["slycat"]["directory"].user(uid)
  if user is None:
    raise cherrypy.HTTPError(404)
  # Only project administrators can get user details ...
  if slycat.web.server.authentication.is_server_administrator():
    user["server-administrator"] = uid in cherrypy.request.app.config["slycat"]["server-admins"]
  return user

@cherrypy.tools.json_out(on = True)
def get_workers(revision=None):
  if revision is not None:
    revision = int(revision)
  timeout = cherrypy.request.app.config["slycat"]["long-polling-timeout"]
  result = pool.workers(revision, timeout)
  if result is None:
    cherrypy.response.status = "204 No change."
    return
  else:
    revision, workers = result
    workers = [worker.status for worker in workers if slycat.web.server.authentication.is_server_administrator() or slycat.web.server.authentication.is_worker_creator(worker)]
    return {"revision" : revision, "workers" : workers}

def countdown_callback():
  cherrypy.log.error("Countdown completed.")

def failure_callback():
  raise Exception("Startup failure test.")

@cherrypy.tools.json_in(on = True)
@cherrypy.tools.json_out(on = True)
def post_workers():
  if "type" not in cherrypy.request.json:
    raise cherrypy.HTTPError("400 unspecified worker type.")

  if cherrypy.request.json["type"] == "table-chunker":
    generate_index = cherrypy.request.json.get("generate-index", None)
    if "mid" in cherrypy.request.json and "artifact" in cherrypy.request.json:
      mid = cherrypy.request.json["mid"]
      artifact = cherrypy.request.json["artifact"]
      database = slycat.web.server.database.couchdb.connect()
      model = database.get("model", mid)
      project = database.get("project", model["project"])
      slycat.web.server.authentication.require_project_reader(project)
      if artifact not in model["artifact-types"]:
        raise cherrypy.HTTPError("400 Artifact %s not in model." % artifact)
      if model["artifact-types"][artifact] != "table":
        raise cherrypy.HTTPError("400 Artifact %s is not a table." % artifact)
      wid = pool.start_worker(slycat.web.server.worker.chunker.table.artifact(cherrypy.request.security, model, artifact, generate_index))
    elif "mid" in cherrypy.request.json and "fid" in cherrypy.request.json:
      mid = cherrypy.request.json["mid"]
      fid = cherrypy.request.json["fid"]
      database = slycat.web.server.database.couchdb.connect()
      model = database.get("model", mid)
      project = database.get("project", model["project"])
      slycat.web.server.authentication.require_project_reader(project)
      wid = pool.start_worker(slycat.web.server.worker.chunker.table.file(cherrypy.request.security, mid, fid, generate_index))
    elif "row-count" in cherrypy.request.json and "column-count" in cherrypy.request.json:
      wid = pool.start_worker(slycat.web.server.worker.chunker.table.test(cherrypy.request.security, cherrypy.request.json["row-count"], cherrypy.request.json["column-count"], generate_index))
    else:
      raise cherrypy.HTTPError("400 Table chunker data source not specified.")
  elif cherrypy.request.json["type"] == "array-chunker":
    if "mid" in cherrypy.request.json and "artifact" in cherrypy.request.json:
      mid = cherrypy.request.json["mid"]
      artifact = cherrypy.request.json["artifact"]
      database = slycat.web.server.database.couchdb.connect()
      model = database.get("model", mid)
      project = database.get("project", model["project"])
      slycat.web.server.authentication.require_project_reader(project)
      if artifact not in model["artifact-types"]:
        raise cherrypy.HTTPError("400 Artifact %s not in model." % artifact)
      if model["artifact-types"][artifact] != "array":
        raise cherrypy.HTTPError("400 Artifact %s is not an array." % artifact)
      wid = pool.start_worker(slycat.web.server.worker.chunker.array.artifact(cherrypy.request.security, model, artifact))
    elif "shape" in cherrypy.request.json:
      wid = pool.start_worker(slycat.web.server.worker.chunker.array.test(cherrypy.request.security, cherrypy.request.json["shape"]))
    else:
      raise cherrypy.HTTPError("400 Array chunker data source not specified.")
  elif cherrypy.request.json["type"] == "timeout":
    wid = pool.start_worker(slycat.web.server.worker.timer.countdown(cherrypy.request.security, "30-second countdown", 30, countdown_callback, cherrypy.request.app.config["slycat"]["server-root"]))
  elif cherrypy.request.json["type"] == "startup-failure":
    wid = pool.start_worker(slycat.web.server.worker.timer.countdown(cherrypy.request.security, "Startup failure", 0, failure_callback))
  else:
    raise cherrypy.HTTPError("400 Unknown worker type: %s" % cherrypy.request.json["type"])

  cherrypy.response.headers["location"] = "%s/workers/%s" % (cherrypy.request.base, wid)
  cherrypy.response.status = "201 Worker created."
  return { "id" : wid }

def get_worker(wid):
  worker = pool.worker(wid)
  if worker is None:
    raise cherrypy.HTTPError(404)
  slycat.web.server.authentication.require_worker_creator(worker)

  accept = cherrypy.lib.cptools.accept(media=["text/html", "application/json"])

  if accept == "text/html":
    context = get_context()
    context["wid"] = wid
    return slycat.web.server.template.render("worker.html", context)

  if accept == "application/json":
    cherrypy.response.headers["content-type"] = accept
    return json.dumps(worker.status)

@cherrypy.tools.json_in(on = True)
def put_worker(wid):
  worker = pool.worker(wid)
  if worker is None:
    raise cherrypy.HTTPError(404)
  slycat.web.server.authentication.require_worker_creator(worker)

  if "result" in cherrypy.request.json and cherrypy.request.json["result"] == "stopped":
    if worker.status["result"] is None:
      worker.stop()
  else:
    for key, value in cherrypy.request.json.items():
      worker.set_status(key, value, namespace="client:")

  cherrypy.response.status = 204

def get_worker_endpoint(name):
  @cherrypy.tools.json_out(on = True)
  def implementation(wid, **arguments):
    worker = pool.worker(wid)
    if worker is None:
      raise cherrypy.HTTPError(404)
    slycat.web.server.authentication.require_worker_creator(worker)

    if not worker.is_alive():
      raise cherrypy.HTTPError("400 Model not running.")
#    if not worker.incremental:
#      raise cherrypy.HTTPError("400 Model doesn't support incremental requests.""")

    try:
      handler = getattr(worker, name)
    except:
      raise cherrypy.HTTPError(404)

    return handler(arguments)
  return implementation

def put_worker_endpoint(name):
  @cherrypy.tools.json_in(on = True)
  @cherrypy.tools.json_out(on = True)
  def implementation(wid):
    worker = pool.worker(wid)
    if worker is None:
      raise cherrypy.HTTPError(404)
    slycat.web.server.authentication.require_worker_creator(worker)

    if not worker.is_alive():
      raise cherrypy.HTTPError("400 Model not running.")
#    if not worker.incremental:
#      raise cherrypy.HTTPError("400 Model doesn't support incremental requests.""")

    try:
      handler = getattr(worker, name)
    except:
      raise cherrypy.HTTPError(404)

    return handler(cherrypy.request.json)
  return implementation

def post_worker_endpoint(name):
  @cherrypy.tools.json_in(on = True, force = False)
  @cherrypy.tools.json_out(on = True)
  def implementation(wid, **arguments):
    worker = pool.worker(wid)
    if worker is None:
      raise cherrypy.HTTPError(404)
    slycat.web.server.authentication.require_worker_creator(worker)

    if not worker.is_alive():
      raise cherrypy.HTTPError("400 Model not running.")
#    if not worker.incremental:
#      raise cherrypy.HTTPError("400 Model doesn't support incremental requests.""")

    try:
      handler = getattr(worker, name)
    except:
      raise cherrypy.HTTPError(404)

    if hasattr(cherrypy.request, "json"):
      return handler(cherrypy.request.json)
    else:
      return handler(arguments)

  return implementation

def delete_worker(wid):
  worker = pool.worker(wid)
  if worker is None:
    raise cherrypy.HTTPError(404)
  slycat.web.server.authentication.require_worker_creator(worker)

  pool.delete(wid)
  cherrypy.response.status = "204 Worker deleted."

def post_events(event):
  # We don't actually have to do anything here, since the request is already logged.
  cherrypy.response.status = "204 Event logged."

def get_test():
  accept = cherrypy.lib.cptools.accept(media=["text/html"])

  if accept == "text/html":
    context = get_context()
    return slycat.web.server.template.render("test.html", context)

def get_test_exception(code):
  def implementation():
    raise cherrypy.HTTPError("%s Intentional server exception." % code)
  return implementation

#def post_test_uploads(**arguments):
#  for key, value in arguments.items():
#    cherrypy.log.error("%s: %s" % (key, value))
