# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

from __future__ import absolute_import

import base64
import cherrypy
import copy
import cStringIO as StringIO
import datetime
import hashlib
import itertools
import json
import logging.handlers
import multiprocessing
import numpy
import optparse
import os
import pprint
import Queue
import subprocess
import sys
import slycat.web.server
import slycat.web.server.authentication
import slycat.web.server.cache
import slycat.web.server.database.couchdb
import slycat.web.server.database.hdf5
import slycat.web.server.ssh
import slycat.web.server.template
import slycat.web.server.timer
import slycat.web.server.worker
import slycat.web.server.worker.model.cca3
import slycat.web.server.worker.model.timeseries
import slycat.web.server.worker.model.generic
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
  elif model_type == "cca":
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
    context["worker"] = model.get("worker", "null")

    marking = cherrypy.request.app.config["slycat"]["marking"]
    context["marking-html"] = marking.html(model["marking"])

    if "model-type" in model and model["model-type"] == "timeseries":
      context["cluster-type"] = model["artifact:cluster-type"] if "artifact:cluster-type" in model else "null"
      context["cluster-bin-type"] = model["artifact:cluster-bin-type"] if "artifact:cluster-bin-type" in model else "null"
      context["cluster-bin-count"] = model["artifact:cluster-bin-count"] if "artifact:cluster-bin-count" in model else "null"
      return slycat.web.server.template.render("model-timeseries.html", context)

    if "model-type" in model and model["model-type"] == "cca3":
      context["input-columns"] = json.dumps(model["artifact:input-columns"]) if "artifact:input-columns" in model else "null"
      context["output-columns"] = json.dumps(model["artifact:output-columns"]) if "artifact:output-columns" in model else "null"
      context["scale-inputs"] = json.dumps(model["artifact:scale-inputs"]) if "artifact:scale-inputs" in model else "null"
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

  metadata = slycat.web.server.cache.get_array_metadata(mid, aid, array, artifact)
  return metadata

def get_model_array_chunk(mid, aid, array, **arguments):
  try:
    attribute = int(arguments["attribute"])
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

  metadata = slycat.web.server.cache.get_array_metadata(mid, aid, array, artifact)

  if not(0 <= attribute and attribute < len(metadata["attributes"])):
    raise cherrypy.HTTPError("400 Attribute argument out-of-range.")
  if len(ranges) != len(metadata["dimensions"]):
    raise cherrypy.HTTPError("400 Ranges argument doesn't contain the correct number of dimensions.")

  ranges = [(max(dimension["begin"], range[0]), min(dimension["end"], range[1])) for dimension, range in zip(metadata["dimensions"], ranges)]

  index = tuple([slice(begin, end) for begin, end in ranges])

  attribute_type =  metadata["attributes"][attribute]["type"]
  with slycat.web.server.database.hdf5.open(artifact["storage"]) as file:
    data = file.array_attribute(array, attribute)[index]

  if byteorder is None:
    return json.dumps(data.tolist())
  else:
    if sys.byteorder != byteorder:
      return data.byteswap().tostring(order="C")
    else:
      return data.tostring(order="C")

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

  metadata = slycat.web.server.cache.get_table_metadata(mid, aid, array, artifact, index)
  return metadata

def get_model_table_rows(rows):
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

def get_model_table_columns(columns):
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

def get_model_table_sort(sort):
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

def get_model_table_byteorder(byteorder):
  if byteorder is not None:
    if byteorder not in ["little", "big"]:
      raise cherrypy.HTTPError("400 Malformed byteorder argument must be 'little' or 'big'.")
    accept = cherrypy.lib.cptools.accept(["application/octet-stream"])
  else:
    accept = cherrypy.lib.cptools.accept(["application/json"])
  cherrypy.response.headers["content-type"] = accept
  return byteorder

@cherrypy.tools.json_out(on = True)
def get_model_table_chunk(mid, aid, array, rows=None, columns=None, index=None, sort=None):
  rows = get_model_table_rows(rows)
  columns = get_model_table_columns(columns)
  sort = get_model_table_sort(sort)

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

  metadata = slycat.web.server.cache.get_table_metadata(mid, aid, array, artifact, index)

  # Constrain end <= count along both dimensions
  rows = rows[rows < metadata["row-count"]]
  if numpy.any(columns >= metadata["column-count"]):
    raise cherrypy.HTTPError("400 Column out-of-range.")
  if sort is not None:
    for column, order in sort:
      if column >= metadata["column-count"]:
        raise cherrypy.HTTPError("400 Sort column out-of-range.")

  # Generate a database query
  data = []
  with slycat.web.server.database.hdf5.open(artifact["storage"]) as file:
    sort_index = numpy.arange(metadata["row-count"])
    if sort is not None:
      sort_column, sort_order = sort[0]
      if index is not None and sort_column == metadata["column-count"]-1:
        pass # At this point, the sort index is already set from above
      else:
        sort_index = numpy.argsort(file.array_attribute(array, sort_column)[...], kind="mergesort")
      if sort_order == "descending":
        sort_index = sort_index[::-1]
    slice = sort_index[rows]
    slice_index = numpy.argsort(slice, kind="mergesort")
    slice_reverse_index = numpy.argsort(slice_index, kind="mergesort")
    for column in columns:
      type = metadata["column-types"][column]
      if index is not None and column == metadata["column-count"]-1:
        values = slice.tolist()
      else:
        values = file.array_attribute(array, column)[slice[slice_index].tolist()][slice_reverse_index].tolist()
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
  rows = get_model_table_rows(rows)
  sort = get_model_table_sort(sort)
  byteorder = get_model_table_byteorder(byteorder)

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

  metadata = slycat.web.server.cache.get_table_metadata(mid, aid, array, artifact, index)

  # Constrain end <= count along both dimensions
  rows = rows[rows < metadata["row-count"]]
  if sort is not None:
    for column, order in sort:
      if column >= metadata["column-count"]:
        raise cherrypy.HTTPError("400 Sort column out-of-range.")

  # Generate a database query
  with slycat.web.server.database.hdf5.open(artifact["storage"]) as file:
    sort_index = numpy.arange(metadata["row-count"])
    if sort is not None:
      sort_column, sort_order = sort[0]
      if index is not None and sort_column == metadata["column-count"]-1:
        pass # At this point, the sort index is already set from above
      else:
        sort_index = numpy.argsort(file.array_attribute(array, sort_column)[...], kind="mergesort")
      if sort_order == "descending":
        sort_index = sort_index[::-1]
    slice = numpy.argsort(sort_index, kind="mergesort")[rows].astype("int32")

  if byteorder is None:
    return json.dumps(slice.tolist())
  else:
    if sys.byteorder != byteorder:
      return slice.byteswap().tostring(order="C")
    else:
      return slice.tostring(order="C")

def get_model_table_unsorted_indices(mid, aid, array, rows=None, index=None, sort=None, byteorder=None):
  rows = get_model_table_rows(rows)
  sort = get_model_table_sort(sort)
  byteorder = get_model_table_byteorder(byteorder)

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

  metadata = slycat.web.server.cache.get_table_metadata(mid, aid, array, artifact, index)

  # Constrain end <= count along both dimensions
  rows = rows[rows < metadata["row-count"]]
  if sort is not None:
    for column, order in sort:
      if column >= metadata["column-count"]:
        raise cherrypy.HTTPError("400 Sort column out-of-range.")

  # Generate a database query
  with slycat.web.server.database.hdf5.open(artifact["storage"]) as file:
    sort_index = numpy.arange(metadata["row-count"])
    if sort is not None:
      sort_column, sort_order = sort[0]
      if index is not None and sort_column == metadata["column-count"]-1:
        pass # At this point, the sort index is already set from above
      else:
        sort_index = numpy.argsort(file.array_attribute(array, sort_column)[...], kind="mergesort")
      if sort_order == "descending":
        sort_index = sort_index[::-1]
    slice = sort_index[rows].astype("int32")

  if byteorder is None:
    return json.dumps(slice.tolist())
  else:
    if sys.byteorder != byteorder:
      return slice.byteswap().tostring(order="C")
    else:
      return slice.tostring(order="C")

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

  if cherrypy.request.json["type"] == "timeout":
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

def get_worker_endpoint(name, force_json_output=True):
  @cherrypy.tools.json_out(on = force_json_output)
  def implementation(wid, **arguments):
    worker = pool.worker(wid)
    if worker is None:
      raise cherrypy.HTTPError(404)
    slycat.web.server.authentication.require_worker_creator(worker)

    if not worker.is_alive():
      raise cherrypy.HTTPError("400 Worker not running.")

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
      raise cherrypy.HTTPError("400 Worker not running.")

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
      raise cherrypy.HTTPError("400 Worker not running.")
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

def get_test_canvas():
  accept = cherrypy.lib.cptools.accept(media=["text/html"])

  if accept == "text/html":
    context = get_context()
    return slycat.web.server.template.render("test-canvas.html", context)

def get_test_grid():
  accept = cherrypy.lib.cptools.accept(media=["text/html"])

  if accept == "text/html":
    context = get_context()
    return slycat.web.server.template.render("test-grid.html", context)

def get_test_exception(code):
  def implementation():
    raise cherrypy.HTTPError("%s Intentional server exception." % code)
  return implementation

@cherrypy.tools.json_out(on = True)
def get_test_array_json(length):
  accept = cherrypy.lib.cptools.accept(media=["application/json"])
  result = numpy.random.randn(int(length))
  return result.tolist()

def get_test_array_arraybuffer(length):
  result = numpy.random.randn(int(length))
  return result.tostring()

#def post_test_uploads(**arguments):
#  for key, value in arguments.items():
#    cherrypy.log.error("%s: %s" % (key, value))
