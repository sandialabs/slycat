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
import numpy
import os
import Queue
import re
import slycat.hdf5
import slycat.hyperslice
import slycat.web.server
import slycat.web.server.authentication
import slycat.web.server.database.couchdb
import slycat.web.server.database.hdf5
import slycat.web.server.model.cca
import slycat.web.server.model.parameter_image
import slycat.web.server.model.tracer_image
import slycat.web.server.model.timeseries
import slycat.web.server.plugin
import slycat.web.server.ssh
import slycat.web.server.template
import stat
import sys
import threading
import time
import uuid

def require_parameter(name):
  if name not in cherrypy.request.json:
    raise cherrypy.HTTPError("400 Missing %s parameter." % name)
  return cherrypy.request.json[name]

def require_boolean_parameter(name):
  value = require_parameter(name)
  if value != True and value != False:
    raise cherrypy.HTTPError("400 Parameter %s must be true or false." % name)
  return value

def get_context():
  """Helper function that populates a default context object for use expanding HTML templates."""
  context = {}
  context["server-root"] = cherrypy.request.app.config["slycat"]["server-root"]
  context["security"] = cherrypy.request.security
  context["is-server-administrator"] = slycat.web.server.authentication.is_server_administrator()
  context["stylesheets"] = {"path" : path for path in cherrypy.request.app.config["slycat"]["stylesheets"]}
  context["marking-types"] = [{"type" : key, "label" : value["label"]} for key, value in slycat.web.server.plugin.manager.markings.items() if key in cherrypy.request.app.config["slycat"]["allowed-markings"]]
  context["help-email"] = cherrypy.request.app.config["site"]["help-email"]
  context["version"] = cherrypy.request.app.config["site"]["version"]
  return context

def get_home():
  raise cherrypy.HTTPRedirect(cherrypy.request.app.config["slycat"]["projects-redirect"])

def get_projects(_=None):
  accept = cherrypy.lib.cptools.accept(["text/html", "application/json"])
  cherrypy.response.headers["content-type"] = accept


  if accept == "text/html":
    context = get_context()
    return slycat.web.server.template.render("projects.html", context)

  if accept == "application/json":
    database = slycat.web.server.database.couchdb.connect()
    projects = [project for project in database.scan("slycat/projects") if slycat.web.server.authentication.is_project_reader(project) or slycat.web.server.authentication.is_project_writer(project) or slycat.web.server.authentication.is_project_administrator(project) or slycat.web.server.authentication.is_server_administrator()]
    projects = sorted(projects, key = lambda x: x["created"], reverse=True)
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

  if accept == "text/html":
    models = [model for model in database.scan("slycat/project-models", startkey=pid, endkey=pid)]
    models = sorted(models, key=lambda x: x["created"], reverse=True)

    for model in models:
      model["marking-html"] = slycat.web.server.plugin.manager.markings[model["marking"]]["html"]

    context = get_context()
    context.update(project)
    context["models"] = models
    context["is-project-administrator"] = slycat.web.server.authentication.is_project_administrator(project)
    context["can-write"] = slycat.web.server.authentication.is_server_administrator() or slycat.web.server.authentication.is_project_administrator(project) or slycat.web.server.authentication.is_project_writer(project)
    context["can-administer"] = slycat.web.server.authentication.is_server_administrator() or slycat.web.server.authentication.is_project_administrator(project)
    context["acl-json"] = json.dumps(project["acl"])
    context["if-remote-hosts"] = len(cherrypy.request.app.config["slycat"]["remote-hosts"])
    context["remote-hosts"] = json.dumps(get_remote_host_dict()).replace('"','\\"')
    context["remote-hosts-arr"] = [host for host in cherrypy.request.app.config["slycat"]["remote-hosts"]]
    context["new-model-name"] = "Model-%s" % (len(models) + 1)

    return slycat.web.server.template.render("project.html", context)

  if accept == "application/json":
    return json.dumps(project)

def get_remote_host_dict():
  remote_host_dict = cherrypy.request.app.config["slycat"]["remote-hosts"]
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

def cleanup_array_worker():
  while True:
    cleanup_arrays.queue.get()
    cherrypy.log.error("Array cleanup started.")
    couchdb = slycat.web.server.database.couchdb.connect()
    for file in couchdb.view("slycat/hdf5-file-counts", group=True):
      if file.value == 0:
        slycat.web.server.database.hdf5.delete(file.key)
        couchdb.delete(couchdb[file.key])
    cherrypy.log.error("Array cleanup finished.")

def cleanup_arrays():
  cleanup_arrays.queue.put("cleanup")
cleanup_arrays.queue = Queue.Queue()
cleanup_arrays.thread = threading.Thread(name="Cleanup arrays", target=cleanup_array_worker)
cleanup_arrays.thread.daemon = True
cleanup_arrays.thread.start()

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
  allowed_model_types = slycat.web.server.plugin.manager.models.keys() + ["cca", "timeseries", "parameter-image", "tracer-image"]
  if model_type not in allowed_model_types:
    raise cherrypy.HTTPError("400 Allowed model types: %s" % ", ".join(allowed_model_types))
  marking = cherrypy.request.json["marking"]

  if marking not in cherrypy.request.app.config["slycat"]["allowed-markings"]:
    raise cherrypy.HTTPError("400 Allowed marking types: %s" % ", ".join(cherrypy.request.app.config["slycat"]["allowed-markings"]))
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
    "creator" : cherrypy.request.security["user"],
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

def get_models(revision=None, _=None):
  if get_models.timeout is None:
    get_models.timeout = cherrypy.tree.apps[""].config["slycat"]["long-polling-timeout"]

  slycat.web.server.model.start_database_monitor()

  accept = cherrypy.lib.cptools.accept(media=["application/json", "text/html"])
  cherrypy.response.headers["content-type"] = accept

  if accept == "text/html":
    context = get_context()
    return slycat.web.server.template.render("models.html", context)
  elif accept == "application/json":
    if revision is not None:
      revision = int(revision)
    start_time = time.time()
    with slycat.web.server.model.updated:
      while revision == slycat.web.server.model.revision:
        slycat.web.server.model.updated.wait(1.0)
        if time.time() - start_time > get_models.timeout:
          cherrypy.response.status = "204 No change."
          return
        if cherrypy.engine.state != cherrypy.engine.states.STARTED:
          cherrypy.response.status = "204 Shutting down."
          return
      database = slycat.web.server.database.couchdb.connect()
      models = [model for model in database.scan("slycat/open-models")]
      projects = [database.get("project", model["project"]) for model in models]
      models = [model for model, project in zip(models, projects) if slycat.web.server.authentication.test_project_reader(project)]
      return json.dumps({"revision" : slycat.web.server.model.revision, "models" : models})
get_models.timeout = None

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
    context["can-write"] = slycat.web.server.authentication.is_server_administrator() or slycat.web.server.authentication.is_project_administrator(project) or slycat.web.server.authentication.is_project_writer(project)
    context["new-model-name"] = "Model-%s" % (model_count + 1)
    context["marking-html"] = slycat.web.server.plugin.manager.markings[model["marking"]]["html"]

    if "model-type" in model and model["model-type"] == "timeseries":
      context["cluster-type"] = model["artifact:cluster-type"] if "artifact:cluster-type" in model else "null"
      context["cluster-bin-type"] = model["artifact:cluster-bin-type"] if "artifact:cluster-bin-type" in model else "null"
      context["cluster-bin-count"] = model["artifact:cluster-bin-count"] if "artifact:cluster-bin-count" in model else "null"
      return slycat.web.server.template.render("model-timeseries.html", context)

    if "model-type" in model and model["model-type"] in ["cca", "cca3"]:
      return slycat.web.server.template.render("model-cca3.html", context)

    if "model-type" in model and model["model-type"] == "parameter-image":
      return slycat.web.server.template.render("model-parameter-image.html", context)
    
    if "model-type" in model and model["model-type"] == "tracer-image":
      return slycat.web.server.template.render("model-tracer-image.html", context)

    if "model-type" in model and model["model-type"] in slycat.web.server.plugin.manager.models.keys():
      context["slycat-plugin-content"] = slycat.web.server.plugin.manager.models[model["model-type"]]["html"](database, model)

    return slycat.web.server.template.render("model.html", context)

@cherrypy.tools.json_in(on = True)
def put_model(mid):
  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_writer(project)

  save_model = False
  for key, value in cherrypy.request.json.items():
    if key in ["name", "description", "state", "result", "progress", "message", "started", "finished"]:
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
  if model["model-type"] not in slycat.web.server.plugin.manager.models.keys() + ["cca", "cca3", "timeseries", "parameter-image", "tracer-image"]:
    raise cherrypy.HTTPError("500 Cannot finish unknown model type.")

  slycat.web.server.model.update(database, model, state="running", started = datetime.datetime.utcnow().isoformat(), progress = 0.0)
  if model["model-type"] in slycat.web.server.plugin.manager.models.keys():
    slycat.web.server.plugin.manager.models[model["model-type"]]["finish"](database, model)
  elif model["model-type"] == "cca":
    slycat.web.server.model.cca.finish(database, model)
  elif model["model-type"] == "timeseries":
    slycat.web.server.model.timeseries.finish(database, model)
  elif model["model-type"] == "parameter-image":
    slycat.web.server.model.parameter_image.finish(database, model)
  elif model["model-type"] == "tracer-image":
    slycat.web.server.model.tracer_image.finish(database, model)
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

  slycat.web.server.model.store_file_artifact(database, model, name, data, content_type, input)

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

  slycat.web.server.model.copy_model_inputs(database, source, model)

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
    with slycat.web.server.ssh.get_session(sid) as session:
      filename = "%s@%s:%s" % (session.username, session.hostname, path)
      if stat.S_ISDIR(session.sftp.stat(path).st_mode):
        raise cherrypy.HTTPError("400 Cannot load directory %s." % filename)
      data = session.sftp.file(path).read()
  else:
    raise cherrypy.HTTPError("400 Must supply a file parameter, or sid and path parameters.")
  slycat.web.server.model.store_table_file(database, model, name, data, filename, nan_row_filtering=False, input=input)

@cherrypy.tools.json_in(on = True)
def put_model_parameter(mid, name):
  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_writer(project)

  value = require_parameter("value")
  input = require_boolean_parameter("input")

  slycat.web.server.model.store_parameter(database, model, name, value, input)

@cherrypy.tools.json_in(on = True)
def put_model_arrayset(mid, name):
  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_writer(project)

  input = require_boolean_parameter("input")

  slycat.web.server.model.start_arrayset(database, model, name, input)

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
  slycat.web.server.model.start_array(database, model, name, array_index, attributes, dimensions)

def put_model_arrayset_data(mid, name, hyperchunks, data, byteorder=None):
  cherrypy.log.error("PUT Model Arrayset Data: arrayset %s hyperchunks %s byteorder %s" % (name, hyperchunks, byteorder))

  # Sanity check inputs ...
  parsed_hyperchunks = []

  try:
    for hyperchunk in hyperchunks.split(";"):
      array, attribute, hyperslices = hyperchunk.split("/")
      array = int(array)
      if array < 0:
        raise Exception()
      attribute = int(attribute)
      if attribute < 0:
        raise Exception()
      hyperslices = [slycat.hyperslice.parse(hyperslice) for hyperslice in hyperslices.split("|")]
      parsed_hyperchunks.append((array, attribute, hyperslices))
  except Exception as e:
    cherrypy.log.error("Parsing exception: %s" % e)
    raise cherrypy.HTTPError("400 hyperchunks argument must be a semicolon-separated sequence of array-index/attribute-index/hyperslices.  Array and attribute indices must be non-negative integers.  Hyperslices must be a vertical-bar-separated sequence of hyperslice specifications.  Each hyperslice must be a comma-separated sequence of dimensions.  Dimensions must be integers, colon-delimmited slice specifications, or ellipses.")

  if byteorder is not None:
    if byteorder not in ["big", "little"]:
      raise cherrypy.HTTPError("400 optional byteorder argument must be big or little.")

  # Handle the request ...
  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_writer(project)

  slycat.web.server.model.store_arrayset_data(database, model, name, parsed_hyperchunks, data, byteorder)

def delete_model(mid):
  couchdb = slycat.web.server.database.couchdb.connect()
  model = couchdb.get("model", mid)
  project = couchdb.get("project", model["project"])
  slycat.web.server.authentication.require_project_writer(project)

  couchdb.delete(model)
  cleanup_arrays()

  cherrypy.response.status = "204 Model deleted."

@cherrypy.tools.json_out(on = True)
def get_model_array_metadata(mid, aid, array):
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

  with slycat.web.server.database.hdf5.lock:
    with slycat.web.server.database.hdf5.open(artifact, "r+") as file: # We open the file with writing enabled because retrieving statistics may need to update the cache.
      hdf5_arrayset = slycat.hdf5.ArraySet(file)
      hdf5_array = hdf5_arrayset[array]
      metadata = dict(dimensions=hdf5_array.dimensions, attributes=hdf5_array.attributes, statistics=[hdf5_array.get_statistics(attribute) for attribute in range(len(hdf5_array.attributes))])
  return metadata

@cherrypy.tools.json_out(on = True)
def get_model_array_attribute_statistics(mid, aid, array, attribute):
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

  with slycat.web.server.database.hdf5.lock:
    with slycat.web.server.database.hdf5.open(artifact, "r+") as file: # We open the file with writing enabled because retrieving statistics may need to update the cache.
      hdf5_arrayset = slycat.hdf5.ArraySet(file)
      hdf5_array = hdf5_arrayset[array]
      return hdf5_array.get_statistics(attribute)

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

  with slycat.web.server.database.hdf5.lock:
    with slycat.web.server.database.hdf5.open(artifact) as file:
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
def get_model_arrayset_metadata(mid, aid, **arguments):
  arrays = arguments.get("arrays", "::")
  arrays = slice(*[int(value) if value != "" else None for value in arrays.split(":")])

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

  with slycat.web.server.database.hdf5.lock:
    with slycat.web.server.database.hdf5.open(artifact) as file:
      arrayset = slycat.hdf5.ArraySet(file)
      results = []
      for key in sorted(arrayset.keys())[arrays]:
        array = arrayset[key]
        results.append({
          "index" : int(key),
          "dimensions" : array.dimensions,
          "attributes" : array.attributes,
          })
      return results

def get_model_arrayset(mid, aid, **arguments):
  accept = cherrypy.lib.cptools.accept(["application/octet-stream"])
  cherrypy.response.headers["content-type"] = accept

  byteorder = arguments.get("byteorder", None)
  if byteorder is None:
    raise cherrypy.HTTPError("400 byteorder parameter must be specified.")

  if byteorder not in ["little", "big"]:
    raise cherrypy.HTTPError("400 Malformed byteorder argument must be 'little' or 'big'.")

  arrays = arguments.get("arrays", "::")
  arrays = slice(*[int(value) if value != "" else None for value in arrays.split(":")])

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

  def content():
    with slycat.web.server.database.hdf5.lock:
      with slycat.web.server.database.hdf5.open(artifact) as file:
        for array_key in sorted([int(key) for key in file["array"].keys()])[arrays]:
          for attribute_key in file["array/%s/attribute" % array_key].keys():
            data = file["array/%s/attribute/%s" % (array_key, attribute_key)][...]
            if sys.byteorder != byteorder:
              yield data.byteswap().tostring(order="C")
            else:
              yield data.tostring(order="C")

  return content()
get_model_arrayset._cp_config = {"response.stream" : True}

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
        cherrypy.log.error("Caching array index for file %s array %s attribute %s" % (file.filename, array_index, sort_column))
        sort_index = numpy.argsort(slycat.hdf5.ArraySet(file)[array_index].get_data(sort_column)[...], kind="mergesort")
        file[index_key] = sort_index
      else:
        cherrypy.log.error("Loading cached sort index.")
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

  with slycat.web.server.database.hdf5.lock:
    with slycat.web.server.database.hdf5.open(artifact, "r+") as file: # We have to open the file with writing enabled because the statistics cache may need to be updated.
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

  with slycat.web.server.database.hdf5.lock:
    with slycat.web.server.database.hdf5.open(artifact, mode="r+") as file:
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

  with slycat.web.server.database.hdf5.lock:
    with slycat.web.server.database.hdf5.open(artifact, mode="r+") as file:
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

  with slycat.web.server.database.hdf5.lock:
    with slycat.web.server.database.hdf5.open(artifact, mode="r+") as file:
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

@cherrypy.tools.json_in(on = True)
@cherrypy.tools.json_out(on = True)
def post_remote():
  username = cherrypy.request.json["username"]
  hostname = cherrypy.request.json["hostname"]
  password = cherrypy.request.json["password"]
  return {"sid":slycat.web.server.ssh.create_session(hostname, username, password)}

@cherrypy.tools.json_in(on = True)
@cherrypy.tools.json_out(on = True)
def post_remote_browse():
  sid = cherrypy.request.json["sid"]
  path = cherrypy.request.json["path"]
  file_reject = re.compile(cherrypy.request.json.get("file-reject")) if "file-reject" in cherrypy.request.json else None
  file_allow = re.compile(cherrypy.request.json.get("file-allow")) if "file-allow" in cherrypy.request.json else None
  directory_reject = re.compile(cherrypy.request.json.get("directory-reject")) if "directory-reject" in cherrypy.request.json else None
  directory_allow = re.compile(cherrypy.request.json.get("directory-allow")) if "directory-allow" in cherrypy.request.json else None

  with slycat.web.server.ssh.get_session(sid) as session:
    try:
      names = []
      sizes = []
      types = []

      for attribute in sorted(session.sftp.listdir_attr(path), key=lambda x: x.filename):
        filepath = os.path.join(path, attribute.filename)
        filetype = "d" if stat.S_ISDIR(attribute.st_mode) else "f"

        if filetype == "d":
          if directory_reject is not None and directory_reject.search(filepath) is not None:
            if directory_allow is None or directory_allow.search(filepath) is None:
              continue

        if filetype == "f":
          if file_reject is not None and file_reject.search(filepath) is not None:
            if file_allow is None or file_allow.search(filepath) is None:
              continue

        names.append(attribute.filename)
        sizes.append(attribute.st_size)
        types.append(filetype)

      response = {"path" : path, "names" : names, "sizes" : sizes, "types" : types}
      return response
    except Exception as e:
      cherrypy.log.error("Error accessing %s: %s %s" % (path, type(e), str(e)))
      raise cherrypy.HTTPError("400 Remote access failed: %s" % str(e))

# need the content type when requesting the image
# GET /remote/:sid/image/file/:path vs /remote/:sid/file/:path
def get_remote_file_as_image(sid, path):
  accept = cherrypy.lib.cptools.accept(["image/jpeg", "image/png"])
  cherrypy.response.headers["content-type"] = accept
  return get_remote_file(sid, path)

def get_remote_file(sid, path):
  #accept = cherrypy.lib.cptools.accept(["image/jpeg", "image/png"])
  #cherrypy.response.headers["content-type"] = accept

  with slycat.web.server.ssh.get_session(sid) as session:
    try:
      if stat.S_ISDIR(session.sftp.stat(path).st_mode):
        raise cherrypy.HTTPError("400 Can't read directory.")
      return session.sftp.file(path).read()
    except Exception as e:
      cherrypy.log.error("Exception reading remote file %s: %s %s" % (path, type(e), str(e)))
      if str(e) == "Garbage packet received":
        raise cherrypy.HTTPError("500 Remote access failed: %s" % str(e))
      if e.strerror == "No such file":
        # TODO this would ideally be a 404, but the alert is not handled the same in the JS -- PM
        raise cherrypy.HTTPError("400 File not found.")
      if e.strerror == "Permission denied":
        # we know the file exists
        # we now know that the file is not available due to access controls
        remote_file = session.sftp.stat(path)
        permissions = remote_file.__str__().split()[0]
        directory = cherrypy.request.app.config["slycat"]["directory"]
        file_permissions = "%s %s %s" % (permissions, directory.username(remote_file.st_uid), directory.groupname(remote_file.st_gid))
        raise cherrypy.HTTPError("400 Permission denied. Current permissions: %s" % file_permissions)
      # catch all
      raise cherrypy.HTTPError("400 Remote access failed: %s" % str(e))

def post_events(event):
  # We don't actually have to do anything here, since the request is already logged.
  cherrypy.response.status = "204 Event logged."

