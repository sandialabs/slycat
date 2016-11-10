# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

from __future__ import absolute_import
import traceback
import cherrypy
import hashlib
import itertools
import json
import logging.handlers
import numbers
import numpy
import os
import time
import Queue
import cPickle
import re
import slycat.email
import slycat.hdf5
import slycat.hyperchunks
import slycat.uri
import slycat.web.server
import slycat.web.server.authentication
import slycat.web.server.cleanup
import slycat.web.server.database.couchdb
import slycat.web.server.hdf5
import slycat.web.server.plugin
import slycat.web.server.remote
import slycat.web.server.resource
import slycat.web.server.streaming
import slycat.web.server.template
import slycat.web.server.upload
import stat
import subprocess
import sys
import threading
import time
import uuid
import functools
from cherrypy._cpcompat import base64_decode
import datetime
import urlparse


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
    return css_bundle._bundle


css_bundle._lock = threading.Lock()
css_bundle._bundle = None


def js_bundle():
    with js_bundle._lock:
        if js_bundle._bundle is None:
            js_bundle._bundle = slycat.web.server.resource.manager.add_bundle("text/javascript",
                                                                              [
                                                                                  "js/curl.js",
                                                                                  # "js/curl-debug.js", # Uncomment this to debug problems loading modules with curl
                                                                                  "js/slycat-curl-config.js",
                                                                                  # Load this immediately following curl to configure it.
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
                                                                                  "js/slycat_file_uploader_factory.js",
                                                                                  "js/slycat-dialog.js",
                                                                                  "js/slycat-markings.js",
                                                                                  "js/slycat-nag.js",
                                                                                  "js/slycat-parsers.js",
                                                                                  "js/slycat-model-controls.js",
                                                                                  "js/slycat-parser-controls.js",
                                                                                  "js/slycat-model-results.js",
                                                                                  "js/slycat-changes-feed.js",
                                                                                  "js/slycat-model-names.js",
                                                                                  "js/slycat-navbar.js",
                                                                                  "js/slycat-local-browser.js",
                                                                                  "js/slycat-remote-browser.js",
                                                                                  "js/slycat-remote-controls.js",
                                                                                  "js/slycat-remotes.js",
                                                                                  "js/slycat-login-controls.js",
                                                                                  "js/slycat-range-slider.js",
                                                                                  "js/slycat-page-main.js",
                                                                                  "js/slycat-projects-main.js",
                                                                                  "js/slycat-project-main.js",
                                                                                  "js/slycat-model-main.js",
                                                                                  "js/slycat-resizing-modals.js",
                                                                                  "js/slycat-table-ingestion.js",
                                                                                  "js/slycat-3d-viewer.js",
                                                                                  "js/slycat-remote-interface.js",
                                                                                  "js/slycat-job-checker.js"
                                                                              ])
    return js_bundle._bundle


js_bundle._lock = threading.Lock()
js_bundle._bundle = None


def get_sid(hostname):
    """
  Takes a hostname address and returns the established sid value
  base on what is found in the users session
  raises 400 and 404
  :param hostname: name of the host we are trying to connect to
  :return: sid : uuid for the session name
  """
    sid = None
    try:
        database = slycat.web.server.database.couchdb.connect()
        session = database.get("session", cherrypy.request.cookie["slycatauth"].value)
        for host_session in session["sessions"]:
            if host_session["hostname"] == hostname:
                sid = host_session["sid"]
                break
    except Exception as e:
        cherrypy.log.error("could not retrieve host session for remotes %s" % e)
        raise cherrypy.HTTPError("404")
    if sid is None:
        raise cherrypy.HTTPError("400 session is None value")
    return sid


def require_json_parameter(name):
    """
      checks to see if the parameter is in the cherrypy.request.json
      and errors gracefully if it is not there
      :param name: name of json param
      :return: value of the json param
    """
    if name not in cherrypy.request.json:
        slycat.email.send_error("slycat.web.server.handlers.py require_json_parameter",
                                "cherrypy.HTTPError 404 missing '%s' parameter." % name)
        raise cherrypy.HTTPError("400 Missing '%s' parameter." % name)
    return cherrypy.request.json[name]


def require_boolean_json_parameter(name):
    value = require_json_parameter(name)
    if value is not True and value is not False:
        slycat.email.send_error("slycat.web.server.handlers.py require_boolean_json_parameter",
                                "cherrypy.HTTPError 400 '%s' parameter must be true or false." % name)
        raise cherrypy.HTTPError("400 '%s' parameter must be true or false." % name)
    return value


def require_array_json_parameter(name):
    array = require_json_parameter(name)
    if not isinstance(array, list):
        slycat.email.send_error("slycat.web.server.handlers.py require_array_json_parameter",
                                "cherrypy.HTTPError 400 '%s' parameter must be an array." % name)
        raise cherrypy.HTTPError("400 '%s' parameter must be an array." % name)
    return array


def require_integer_array_json_parameter(name):
    array = require_array_json_parameter(name)
    try:
        array = [int(value) for value in array]
    except:
        slycat.email.send_error("slycat.web.server.handlers.py require_integer_array_json_parameter",
                                "cherrypy.HTTPError 400 '%s' parameter must be an array of integers." % name)
        raise cherrypy.HTTPError("400 '%s' parameter must be an array of integers." % name)
    return array


def require_integer_parameter(value, name):
    try:
        return int(value)
    except:
        slycat.email.send_error("slycat.web.server.handlers.py require_integer_parameter",
                                "cherrypy.HTTPError 400 '%s' parameter must be an integer." % name)
        raise cherrypy.HTTPError("400 '%s' parameter must be an integer." % name)


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
        projects = [project for project in database.scan("slycat/projects") if
                    slycat.web.server.authentication.is_project_reader(
                        project) or slycat.web.server.authentication.is_project_writer(
                        project) or slycat.web.server.authentication.is_project_administrator(
                        project) or slycat.web.server.authentication.is_server_administrator()]
        projects = sorted(projects, key=lambda x: x["created"], reverse=True)
        return json.dumps({"revision": 0, "projects": projects})


@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def post_projects():
    if "name" not in cherrypy.request.json:
        slycat.email.send_error("slycat.web.server.handlers.py post_projects",
                                "cherrypy.HTTPError 400 missing project name.")
        raise cherrypy.HTTPError("400 Missing project name.")

    database = slycat.web.server.database.couchdb.connect()
    pid, rev = database.save({
        "type": "project",
        "acl": {"administrators": [{"user": cherrypy.request.login}], "readers": [], "writers": []},
        "created": datetime.datetime.utcnow().isoformat(),
        "creator": cherrypy.request.login,
        "description": cherrypy.request.json.get("description", ""),
        "name": cherrypy.request.json["name"]
    })
    cherrypy.response.headers["location"] = "%s/projects/%s" % (cherrypy.request.base, pid)
    cherrypy.response.status = "201 Project created."
    return {"id": pid}


def get_project(pid):
    """
  returns a project based on "content-type" header
  :param pid: project ID
  :return: Either html landing page of given project or the json
  representation of the project
  """

    # Return the client's preferred media-type (from the given Content-Types)
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
        context["slycat-project-name"] = project.get("name", "").replace("'", "\\'")
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


@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def put_project(pid):
    database = slycat.web.server.database.couchdb.connect()
    project = database.get("project", pid)
    slycat.web.server.authentication.require_project_writer(project)

    mutations = []
    if "acl" in cherrypy.request.json:
        slycat.web.server.authentication.require_project_administrator(project)
        if "administrators" not in cherrypy.request.json["acl"]:
            slycat.email.send_error("slycat.web.server.handlers.py put_project",
                                    "cherrypy.HTTPError 400 missing administrators.")
            raise cherrypy.HTTPError("400 missing administrators")
        if "writers" not in cherrypy.request.json["acl"]:
            slycat.email.send_error("slycat.web.server.handlers.py put_project",
                                    "cherrypy.HTTPError 400 missing writers.")
            raise cherrypy.HTTPError("400 missing writers")
        if "readers" not in cherrypy.request.json["acl"]:
            slycat.email.send_error("slycat.web.server.handlers.py put_project",
                                    "cherrypy.HTTPError 400 missing readers.")
            raise cherrypy.HTTPError("400 missing readers")
        project["acl"] = cherrypy.request.json["acl"]

    if "name" in cherrypy.request.json:
        project["name"] = cherrypy.request.json["name"]

    if "description" in cherrypy.request.json:
        project["description"] = cherrypy.request.json["description"]

    database.save(project)


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
    slycat.web.server.cleanup.arrays()

    cherrypy.response.status = "204 Project deleted."


@cherrypy.tools.json_out(on=True)
def get_project_models(pid):
    database = slycat.web.server.database.couchdb.connect()
    project = database.get("project", pid)
    slycat.web.server.authentication.require_project_reader(project)

    models = [model for model in database.scan("slycat/project-models", startkey=pid, endkey=pid)]
    models = sorted(models, key=lambda x: x["created"], reverse=True)
    return models


@cherrypy.tools.json_out(on=True)
def get_project_references(pid):
    database = slycat.web.server.database.couchdb.connect()
    project = database.get("project", pid)
    slycat.web.server.authentication.require_project_reader(project)

    references = [reference for reference in database.scan("slycat/project-references", startkey=pid, endkey=pid)]
    references = sorted(references, key=lambda x: x["created"])
    return references


@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def post_project_models(pid):
    """
  When a pid along with json "model-type", "marking", "name" is sent with POST
  creates a model and saves it to the database
  :param pid: project ID for created model
  :return: json {"id" : mid}
  """
    database = slycat.web.server.database.couchdb.connect()
    project = database.get("project", pid)
    slycat.web.server.authentication.require_project_writer(project)

    # create the model
    model_type = require_json_parameter("model-type")
    allowed_model_types = slycat.web.server.plugin.manager.models.keys()
    if model_type not in allowed_model_types:
        slycat.email.send_error("slycat.web.server.handlers.py post_project_models",
                                "cherrypy.HTTPError allowed model types: %s" % ", ".join(allowed_model_types))
        raise cherrypy.HTTPError("400 Allowed model types: %s" % ", ".join(allowed_model_types))

    marking = require_json_parameter("marking")
    if marking not in cherrypy.request.app.config["slycat-web-server"]["allowed-markings"]:
        slycat.email.send_error("slycat.web.server.handlers.py post_project_models",
                                "cherrypy.HTTPError 400 allowed marking types: %s" % ", ".join(
                                    cherrypy.request.app.config["slycat-web-server"]["allowed-markings"]))
        raise cherrypy.HTTPError("400 Allowed marking types: %s" % ", ".join(
            cherrypy.request.app.config["slycat-web-server"]["allowed-markings"]))

    name = require_json_parameter("name")
    description = cherrypy.request.json.get("description", "")
    mid = uuid.uuid4().hex

    model = {
        "_id": mid,
        "type": "model",
        "model-type": model_type,
        "marking": marking,
        "project": pid,
        "created": datetime.datetime.utcnow().isoformat(),
        "creator": cherrypy.request.login,
        "name": name,
        "description": description,
        "artifact-types": {},
        "input-artifacts": [],
        "state": "waiting",
        "result": None,
        "started": None,
        "finished": None,
        "progress": None,
        "message": None,
    }
    database.save(model)

    cherrypy.response.headers["location"] = "%s/models/%s" % (cherrypy.request.base, mid)
    cherrypy.response.status = "201 Model created."
    return {"id": mid}


@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def post_project_bookmarks(pid):
    database = slycat.web.server.database.couchdb.connect()
    project = database.get("project", pid)
    slycat.web.server.authentication.require_project_reader(
        project)  # This is intentionally out-of-the-ordinary - we explicitly allow project *readers* to store bookmarks.

    content = json.dumps(cherrypy.request.json, separators=(",", ":"), indent=None, sort_keys=True)
    bid = hashlib.md5(pid + content).hexdigest()

    try:
        doc = database[bid]
    except:
        doc = {
            "_id": bid,
            "project": pid,
            "type": "bookmark"
        }
        database.save(doc)
        database.put_attachment(doc, filename="bookmark", content_type="application/json", content=content)

    cherrypy.response.headers["location"] = "%s/bookmarks/%s" % (cherrypy.request.base, bid)
    cherrypy.response.status = "201 Bookmark stored."
    return {"id": bid}


@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def post_project_references(pid):
    database = slycat.web.server.database.couchdb.connect()
    project = database.get("project", pid)
    slycat.web.server.authentication.require_project_writer(project)

    rid = uuid.uuid4().hex

    reference = {
        "_id": rid,
        "type": "reference",
        "project": pid,
        "created": datetime.datetime.utcnow().isoformat(),
        "creator": cherrypy.request.login,
        "name": require_json_parameter("name"),
        "model-type": cherrypy.request.json.get("model-type", None),
        "mid": cherrypy.request.json.get("mid", None),
        "bid": cherrypy.request.json.get("bid", None),
    }
    database.save(reference)

    cherrypy.response.headers["location"] = "%s/references/%s" % (cherrypy.request.base, rid)
    cherrypy.response.status = "201 Reference created."
    return {"id": rid}


@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def put_reference(rid):
    couchdb = slycat.web.server.database.couchdb.connect()
    reference = couchdb.get("reference", rid)
    project = couchdb.get("project", reference["project"])
    slycat.web.server.authentication.require_project_writer(project)

    if cherrypy.request.json.get("name", None):
        reference["name"] = cherrypy.request.json.get("name", None)
    if cherrypy.request.json.get("bid", None):
        reference["bid"] = cherrypy.request.json.get("bid", None)

    couchdb.save(reference)

    cherrypy.response.status = "201 Reference updated."


def get_page(ptype):
    database = slycat.web.server.database.couchdb.connect()

    context = {}
    context["slycat-server-root"] = cherrypy.request.app.config["slycat-web-server"]["server-root"]
    context["slycat-css-bundle"] = css_bundle()
    context["slycat-js-bundle"] = js_bundle()
    context["slycat-page-type"] = ptype

    if ptype not in slycat.web.server.plugin.manager.pages:
        context["slycat-page-html"] = u"""
    <div style="-webkit-flex:1;flex:1;display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;-webkit-justify-content:center;justify-content:center; text-align:center; font-size: 21px;">
      <p>No plugin available for page type \u201c%s\u201d.</p>
    </div>""" % ptype
        return slycat.web.server.template.render("slycat-page.html", context)

    context["slycat-page-html"] = slycat.web.server.plugin.manager.pages[ptype]["html"](database, model=None)
    if ptype in slycat.web.server.plugin.manager.page_bundles:
        context["slycat-page-css-bundles"] = [{"bundle": key} for key, (content_type, content) in
                                              slycat.web.server.plugin.manager.page_bundles[ptype].items() if
                                              content_type == "text/css"]
        context["slycat-page-js-bundles"] = [{"bundle": key} for key, (content_type, content) in
                                             slycat.web.server.plugin.manager.page_bundles[ptype].items() if
                                             content_type == "text/javascript"]

    return slycat.web.server.template.render("slycat-page.html", context)


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
        ptype = kwargs.get("ptype", None)
        cherrypy.log.error("mtype: %s ptype: %s" % (mtype, ptype))

        marking = slycat.web.server.plugin.manager.markings[model["marking"]]

        context = {}
        context["slycat-server-root"] = cherrypy.request.app.config["slycat-web-server"]["server-root"]
        context["slycat-marking-before-html"] = marking["badge"] if marking["page-before"] is None else marking[
            "page-before"]
        context["slycat-marking-after-html"] = marking["badge"] if marking["page-after"] is None else marking[
            "page-after"]

        context["slycat-model"] = model
        context["slycat-model-name"] = model.get("name", "").replace("'", "\\'")

        context["slycat-project"] = project
        context["slycat-project-name"] = project.get("name", "").replace("'", "\\'")

        context["slycat-css-bundle"] = css_bundle()
        context["slycat-js-bundle"] = js_bundle()
        context["slycat-model-type"] = mtype

        if mtype not in slycat.web.server.plugin.manager.models.keys():
            context["slycat-page-html"] = u"""
      <div style="-webkit-flex:1;flex:1;display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;-webkit-justify-content:center;justify-content:center; text-align:center; font-size: 21px;">
        <p>No plugin available for model type \u201c%s\u201d.</p>
      </div>""" % mtype
            return slycat.web.server.template.render("slycat-model-page.html", context)

        if ptype is None:
            ptype = slycat.web.server.plugin.manager.models[mtype]["ptype"]

        if ptype not in slycat.web.server.plugin.manager.pages:
            context["slycat-page-html"] = u"""
      <div style="-webkit-flex:1;flex:1;display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;-webkit-justify-content:center;justify-content:center; text-align:center; font-size: 21px;">
        <p>No plugin available for page type \u201c%s\u201d.</p>
      </div>""" % ptype
            return slycat.web.server.template.render("slycat-model-page.html", context)

        context["slycat-page-type"] = ptype
        context["slycat-page-html"] = slycat.web.server.plugin.manager.pages[ptype]["html"](database, model)
        if ptype in slycat.web.server.plugin.manager.page_bundles:
            context["slycat-page-css-bundles"] = [{"bundle": key} for key, (content_type, content) in
                                                  slycat.web.server.plugin.manager.page_bundles[ptype].items() if
                                                  content_type == "text/css"]
            context["slycat-page-js-bundles"] = [{"bundle": key} for key, (content_type, content) in
                                                 slycat.web.server.plugin.manager.page_bundles[ptype].items() if
                                                 content_type == "text/javascript"]

        return slycat.web.server.template.render("slycat-model-page.html", context)


def model_command(mid, type, command, **kwargs):
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    project = database.get("project", model["project"])
    slycat.web.server.authentication.require_project_reader(project)

    key = (cherrypy.request.method, type, command)
    if key in slycat.web.server.plugin.manager.model_commands:
        return slycat.web.server.plugin.manager.model_commands[key](database, model, cherrypy.request.method, type,
                                                                    command, **kwargs)

    slycat.email.send_error("slycat.web.server.handlers.py model_command",
                            "cherrypy.HTTPError 400 unknown command: %s" % command)
    raise cherrypy.HTTPError("400 Unknown command: %s" % command)


@cherrypy.tools.json_in(on=True)
def model_sensitive_command(mid, type, command):
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    project = database.get("project", model["project"])
    slycat.web.server.authentication.require_project_reader(project)
    kwargs = cherrypy.request.json

    key = (cherrypy.request.method, type, command)
    if key in slycat.web.server.plugin.manager.model_commands:
        return slycat.web.server.plugin.manager.model_commands[key](database, model, cherrypy.request.method, type,
                                                                    command, **kwargs)

    slycat.email.send_error("slycat.web.server.handlers.py model_sensitive_command",
                            "cherrypy.HTTPError 400 unknown command: %s" % command)
    raise cherrypy.HTTPError("400 Unknown command: %s" % command)


def get_page_resource(ptype, resource):
    if ptype in slycat.web.server.plugin.manager.page_bundles:
        if resource in slycat.web.server.plugin.manager.page_bundles[ptype]:
            content_type, content = slycat.web.server.plugin.manager.page_bundles[ptype][resource]
            cherrypy.response.headers["content-type"] = content_type
            return content
    if ptype in slycat.web.server.plugin.manager.page_resources:
        for page_resource, page_path in slycat.web.server.plugin.manager.page_resources[ptype].items():
            if page_resource == resource:
                return cherrypy.lib.static.serve_file(page_path)

    # slycat.email.send_error("slycat.web.server.handlers.py get_page_resource", "cherrypy.HTTPError 404 invalid input type: %s" % ptype)
    raise cherrypy.HTTPError("404")


def get_wizard_resource(wtype, resource):
    if wtype in slycat.web.server.plugin.manager.wizard_resources:
        for wizard_resource, wizard_path in slycat.web.server.plugin.manager.wizard_resources[wtype].items():
            if wizard_resource == resource:
                return cherrypy.lib.static.serve_file(wizard_path)

    slycat.email.send_error("slycat.web.server.handlers.py get_wizard_resource",
                            "cherrypy.HTTPError 404 invalid input wizard type: %s" % wtype)
    raise cherrypy.HTTPError("404")


@cherrypy.tools.json_in(on=True)
def put_model(mid):
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    project = database.get("project", model["project"])
    slycat.web.server.authentication.require_project_writer(project)

    save_model = False
    for key, value in cherrypy.request.json.items():
        if key not in ["name", "description", "state", "result", "progress", "message", "started", "finished",
                       "marking"]:
            slycat.email.send_error("slycat.web.server.handlers.py put_model",
                                    "cherrypy.HTTPError 400 unknown model parameter: %s" % key)
            raise cherrypy.HTTPError("400 Unknown model parameter: %s" % key)

        if key in ["started", "finished"]:
            try:
                datetime.datetime.strptime(value, "%Y-%m-%dT%H:%M:%S.%f")
            except:
                slycat.email.send_error("slycat.web.server.handlers.py put_model",
                                        "cherrypy.HTTPError 400 timestamp fields must use ISO-8601.")
                raise cherrypy.HTTPError("400 Timestamp fields must use ISO-8601.")

        if value != model.get(key):
            model[key] = value
            save_model = True

    if save_model:
        database.save(model)


def post_model_finish(mid):
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    project = database.get("project", model["project"])
    slycat.web.server.authentication.require_project_writer(project)

    # check state of the model
    if model["state"] != "waiting":
        slycat.email.send_error("slycat.web.server.handlers.py post_model_finish",
                                "cherrypy.HTTPError 400 only waiting models can be finished.")
        raise cherrypy.HTTPError("400 Only waiting models can be finished.")
    # check if the model type exists
    if model["model-type"] not in slycat.web.server.plugin.manager.models.keys():
        slycat.email.send_error("slycat.web.server.handlers.py post_model_finish",
                                "cherrypy.HTTPError 500 cannot finish unknown model type.")
        raise cherrypy.HTTPError("500 Cannot finish unknown model type.")
    #
    slycat.web.server.update_model(database, model, state="running", started=datetime.datetime.utcnow().isoformat(),
                                   progress=0.0)
    slycat.web.server.plugin.manager.models[model["model-type"]]["finish"](database, model)
    cherrypy.response.status = "202 Finishing model."


def post_model_files(mid, input=None, files=None, sids=None, paths=None, aids=None, parser=None, **kwargs):
    if input is None:
        slycat.email.send_error("slycat.web.server.handlers.py post_model_files",
                                "cherrypy.HTTPError 400 required input parameter is missing.")
        raise cherrypy.HTTPError("400 Required input parameter is missing.")
    input = True if input == "true" else False

    if files is not None and sids is None and paths is None:
        if not isinstance(files, list):
            files = [files]
        files = [file.file.read() for file in files]
    elif files is None and sids is not None and paths is not None:
        if not isinstance(sids, list):
            sids = [sids]
        if not isinstance(paths, list):
            paths = [paths]
        if len(sids) != len(paths):
            slycat.email.send_error("slycat.web.server.handlers.py post_model_files",
                                    "cherrypy.HTTPError 400 sids and paths parameter must have the same length.")
            raise cherrypy.HTTPError("400 sids and paths parameters must have the same length.")
        files = []
        for sid, path in zip(sids, paths):
            with slycat.web.server.remote.get_session(sid) as session:
                filename = "%s@%s:%s" % (session.username, session.hostname, path)
                if stat.S_ISDIR(session.sftp.stat(path).st_mode):
                    slycat.email.send_error("slycat.web.server.handlers.py post_model_files",
                                            "cherrypy.HTTPError 400 cannot load directory %s." % filename)
                    raise cherrypy.HTTPError("400 Cannot load directory %s." % filename)
                files.append(session.sftp.file(path).read())
    else:
        slycat.email.send_error("slycat.web.server.handlers.py post_model_files",
                                "cherrypy.HTTPError 400 must supply files parameter, or sids and path parameters.")
        raise cherrypy.HTTPError("400 Must supply files parameter, or sids and paths parameters.")

    if aids is None:
        aids = []
    if not isinstance(aids, list):
        aids = [aids]

    if parser is None:
        slycat.email.send_error("slycat.web.server.handlers.py post_model_files",
                                "cherrypy.HTTPError 400 required parser parameter is missing.")
        raise cherrypy.HTTPError("400 Required parser parameter is missing.")
    if parser not in slycat.web.server.plugin.manager.parsers:
        slycat.email.send_error("slycat.web.server.handlers.py post_model_files",
                                "cherrypy.HTTPError 400 unknown parser plugin: %s" % parser)
        raise cherrypy.HTTPError("400 Unknown parser plugin: %s." % parser)

    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    project = database.get("project", model["project"])
    slycat.web.server.authentication.require_project_writer(project)

    try:
        slycat.web.server.plugin.manager.parsers[parser]["parse"](database, model, input, files, aids, **kwargs)
    except Exception as e:
        cherrypy.log.error("Exception parsing posted files: %s" % e)
        slycat.email.send_error("slycat.web.server.handlers.py post_model_files",
                                "cherrypy.HTTPError 400 %s" % e.message)
        raise cherrypy.HTTPError("400 %s" % e.message)


@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def post_uploads():
    """
  creates a session for uploading a file to
  :return: Upload ID
  """
    mid = require_json_parameter("mid")
    input = require_boolean_json_parameter("input")
    parser = require_json_parameter("parser")
    aids = require_json_parameter("aids")
    if parser not in slycat.web.server.plugin.manager.parsers:
        slycat.email.send_error("slycat.web.server.handlers.py post_uploads",
                                "cherrypy.HTTPError 400 unknown parser plugin: %s." % parser)
        raise cherrypy.HTTPError("400 Unknown parser plugin: %s." % parser)

    kwargs = {key: value for key, value in cherrypy.request.json.items() if
              key not in ["mid", "input", "parser", "aids"]}

    uid = slycat.web.server.upload.create_session(mid, input, parser, aids, kwargs)

    cherrypy.response.headers["location"] = "%s/uploads/%s" % (cherrypy.request.base, uid)
    cherrypy.response.status = "201 Upload started."
    return {"id": uid}


def put_upload_file_part(uid, fid, pid, file=None, hostname=None, path=None):
    fid = require_integer_parameter(fid, "fid")
    pid = require_integer_parameter(pid, "pid")

    if file is not None and hostname is None and path is None:
        data = file.file.read()
    elif file is None and hostname is not None and path is not None:
        sid = get_sid(hostname)
        with slycat.web.server.remote.get_session(sid) as session:
            filename = "%s@%s:%s" % (session.username, session.hostname, path)
            if stat.S_ISDIR(session.sftp.stat(path).st_mode):
                slycat.email.send_error("slycat.web.server.handlers.py put_upload_file_part",
                                        "cherrypy.HTTPError 400 cannot load directory %s." % filename)
                raise cherrypy.HTTPError("400 Cannot load directory %s." % filename)
            data = session.sftp.file(path).read()
    else:
        slycat.email.send_error("slycat.web.server.handlers.py put_upload_file_part",
                                "cherrypy.HTTPError 400 must supply file parameter, or sid and path parameters.")
        raise cherrypy.HTTPError("400 Must supply file parameter, or sid and path parameters.")

    with slycat.web.server.upload.get_session(uid) as session:
        session.put_upload_file_part(fid, pid, data)


@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def post_upload_finished(uid):
    """
  ask the server to finish the upload
  :param uid: upload session ID
  :return: status of upload
  """
    uploaded = require_integer_array_json_parameter("uploaded")
    with slycat.web.server.upload.get_session(uid) as session:
        return session.post_upload_finished(uploaded)


def delete_upload(uid):
    slycat.web.server.upload.delete_session(uid)
    cherrypy.response.status = "204 Upload session deleted."


@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def login():
    """
  Takes the post object under cherrypy.request.json with the users name and password
  and determins with the user can be authenticated with slycat
  :return: authentication status
  """
    cherrypy.log.error("login attempt started %s" % datetime.datetime.utcnow())
    # try and delete any outdated sessions for the user if they have the cookie for it
    if "slycatauth" in cherrypy.request.cookie:
        try:
            cherrypy.log.error("found old session trying to delete it ")
            sid = cherrypy.request.cookie["slycatauth"].value
            couchdb = slycat.web.server.database.couchdb.connect()
            session = couchdb.get("session", sid)
            if session is not None:
                couchdb.delete(session)
        except:
            # if an exception was throw there is nothing to be done
            pass

    # try and decode the username and password
    try:
        cherrypy.log.error("decoding username and password")
        user_name = base64_decode(cherrypy.request.json["user_name"])
        password = base64_decode(cherrypy.request.json["password"])

        # try and get the redirect path for after successful login
        try:
            location = cherrypy.request.json["location"]
        except Exception as e:
            location = None
            cherrypy.log.error("no location provided moving on")
    except Exception as e:
        cherrypy.log.error("username and password could not be decoded")
        slycat.email.send_error("slycat-standard-authentication.py authenticate", "cherrypy.HTTPError 400")
        raise cherrypy.HTTPError(400)
    realm = None

    # get the route they came from and check if the server root is the same,
    # if so redirect to the place they came from
    current_url = urlparse.urlparse(cherrypy.url())  # gets current location on the server
    try:
        if urlparse.parse_qs(urlparse.urlparse(location['href']).query)['from']:  # get from query href
            response_url = urlparse.parse_qs(urlparse.urlparse(location['href']).query)['from'][0]
            if not response_url.__contains__(
                    current_url.netloc):  # check net location to avoid cross site script attacks
                response_url = "https://" + current_url.netloc + "/projects"
        else:
            response_url = "https://" + current_url.netloc + "/projects"
    except Exception as e:
        cherrypy.log.error("no location provided setting target to /projects")
        response_url = "https://" + current_url.netloc + "/projects"

    # Get the client ip, which might be forwarded by a proxy.
    remote_ip = cherrypy.request.headers.get(
        "x-forwarded-for") if "x-forwarded-for" in cherrypy.request.headers else cherrypy.request.rem

    # see if we have a registered password checking function from our config
    if login.password_check is None:
        if "password-check" not in cherrypy.request.app.config["slycat-web-server"]:
            raise cherrypy.HTTPError("500 No password check configured.")
        plugin = cherrypy.request.app.config["slycat-web-server"]["password-check"]["plugin"]
        args = cherrypy.request.app.config["slycat-web-server"]["password-check"].get("args", [])
        kwargs = cherrypy.request.app.config["slycat-web-server"]["password-check"].get("kwargs", {})
        if plugin not in slycat.web.server.plugin.manager.password_checks.keys():
            slycat.email.send_error("slycat-standard-authentication.py authenticate",
                                    "cherrypy.HTTPError 500 no password check plugin found.")
            raise cherrypy.HTTPError("500 No password check plugin found.")
        login.password_check = functools.partial(slycat.web.server.plugin.manager.password_checks[plugin], *args,
                                                 **kwargs)

    # time to test username and password
    success, groups = login.password_check(realm, user_name, password)

    if success:
        cherrypy.log.error("%s@%s: Password check succeeded. checking for rules" % (user_name, remote_ip))
        # Successful authentication, now check access rules.
        authentication_kwargs = cherrypy.request.app.config["slycat-web-server"]["authentication"]["kwargs"]
        # for rules see slycat config file
        rules = []
        if "rules" in authentication_kwargs:
            rules = authentication_kwargs["rules"]
        if "realm" in authentication_kwargs:
            realm = authentication_kwargs["realm"]
        cherrypy.log.error(("rules: %s args: %s" % (rules, authentication_kwargs)))

        if rules:
            # found rules now time to apply them
            cherrypy.log.error("found rules::%s:: applying them to the user" % (rules))
            deny = True
            for operation, category, members in rules:
                if operation not in ["allow"]:
                    raise cherrypy.HTTPError("500 Unknown access rule operation: %s." % operation)
                if category not in ["users", "groups", "directory"]:
                    raise cherrypy.HTTPError("500 Unknown access rule category: %s." % category)
                if category in ["groups"]:
                    # see the slycat-dev web config for an example with this rule
                    # verify the group given in rules is one of the user's meta groups as returned by the ldap password fn
                    for group in groups:
                        if group in members:
                            deny = False
                if category in ["directory"]:
                    try:
                        lookupResult = cherrypy.request.app.config["slycat-web-server"]["directory"](user_name)
                        if lookupResult != {}:
                            deny = False
                    except:
                        cherrypy.log.error("Authentication failed to confirm %s is in access directory." % user_name)
                if deny:
                    raise cherrypy.HTTPError("403 User denied by authentication rules.")
        else:
            cherrypy.log.error("no rules were found")
        # Successful authentication and access verification, create a session and return.
        sid = uuid.uuid4().hex
        session = {"created": datetime.datetime.utcnow(), "creator": user_name}
        database = slycat.web.server.database.couchdb.connect()
        database.save(
            {"_id": sid, "type": "session", "created": session["created"].isoformat(), "creator": session["creator"],
             'groups': groups, 'ip': remote_ip, "sessions": []})

        login.sessions[sid] = session

        cherrypy.response.cookie["slycatauth"] = sid
        cherrypy.response.cookie["slycatauth"]["path"] = "/"
        cherrypy.response.cookie["slycatauth"]["secure"] = 1
        cherrypy.response.cookie["slycatauth"]["httponly"] = 1
        timeout = int(cherrypy.request.app.config["slycat"]["session-timeout"].total_seconds())
        cherrypy.response.cookie["slycatauth"]["Max-Age"] = timeout
        cherrypy.response.cookie["slycattimeout"] = "timeout"
        cherrypy.response.cookie["slycattimeout"]["path"] = "/"
        cherrypy.response.cookie["slycattimeout"]["Max-Age"] = timeout

        cherrypy.response.status = "200 OK"
        cherrypy.request.login = user_name
        cherrypy.log.error("cookie returned %s success:%s response_url:%s" % (
            cherrypy.response.cookie["slycatauth"], success, response_url))
    else:
        cherrypy.log.error("user %s at %s failed authentication" % (user_name, remote_ip))
        cherrypy.response.status = "404 no auth found!!!"

    return {'success': success, 'target': response_url}


login.password_check = None
login.sessions = {}
login.session_cleanup = None


def logout():
    """
  See if the client has a valid session.
  If so delete it
  :return: the status of the request
  """
    try:
        if "slycatauth" in cherrypy.request.cookie:
            sid = cherrypy.request.cookie["slycatauth"].value

            # expire the old cookies
            cherrypy.response.cookie["slycatauth"] = sid
            cherrypy.response.cookie["slycatauth"]['expires'] = 0

            cherrypy.response.cookie["slycattimeout"] = "timeout"
            cherrypy.response.cookie["slycattimeout"]['expires'] = 0

            couchdb = slycat.web.server.database.couchdb.connect()
            session = couchdb.get("session", sid)
            if session is not None:
                cherrypy.response.status = "200 session deleted." + str(couchdb.delete(session))
            else:
                cherrypy.response.status = "400 Bad Request no session to delete."
        else:
            cherrypy.response.status = "403 Forbidden"
    except Exception as e:
        raise cherrypy.HTTPError("400 Bad Request")


@cherrypy.tools.json_in(on=True)
def put_model_inputs(mid):
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    project = database.get("project", model["project"])
    slycat.web.server.authentication.require_project_writer(project)

    sid = cherrypy.request.json["sid"]
    deep_copy = cherrypy.request.json.get("deep-copy", False)
    source = database.get("model", sid)
    if source["project"] != model["project"]:
        slycat.email.send_error("slycat.web.server.handlers.py put_model_inputs",
                                "cherrypy.HTTPError 400 cannot duplicate a model from another project.")
        raise cherrypy.HTTPError("400 Cannot duplicate a model from another project.")

    slycat.web.server.put_model_inputs(database, model, source, deep_copy)


@cherrypy.tools.json_in(on=True)
def put_model_parameter(mid, aid):
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    project = database.get("project", model["project"])
    slycat.web.server.authentication.require_project_writer(project)

    value = require_json_parameter("value")
    input = require_boolean_json_parameter("input")

    slycat.web.server.put_model_parameter(database, model, aid, value, input)


@cherrypy.tools.json_in(on=True)
def put_model_arrayset(mid, aid):
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    project = database.get("project", model["project"])
    slycat.web.server.authentication.require_project_writer(project)

    input = require_boolean_json_parameter("input")

    slycat.web.server.put_model_arrayset(database, model, aid, input)


@cherrypy.tools.json_in(on=True)
def put_model_arrayset_array(mid, aid, array):
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    project = database.get("project", model["project"])
    slycat.web.server.authentication.require_project_writer(project)

    # Sanity-check inputs ...
    array_index = int(array)
    attributes = cherrypy.request.json["attributes"]
    dimensions = cherrypy.request.json["dimensions"]
    slycat.web.server.put_model_array(database, model, aid, array_index, attributes, dimensions)


def put_model_arrayset_data(mid, aid, hyperchunks, data, byteorder=None):
    # Validate inputs.
    try:
        hyperchunks = slycat.hyperchunks.parse(hyperchunks)
    except:
        slycat.email.send_error("slycat.web.server.handlers.py put_model_arrayset_data",
                                "cherrypy.HTTPError 400 not a valid hyperchunks specification.")
        raise cherrypy.HTTPError("400 Not a valid hyperchunks specification.")

    if byteorder is not None:
        if byteorder not in ["big", "little"]:
            slycat.email.send_error("slycat.web.server.handlers.py put_model_arrayset_data",
                                    "cherrypy.HTTPError 400 optional byteorder argument must be big or little.")
            raise cherrypy.HTTPError("400 optional byteorder argument must be big or little.")

    # Handle the request.
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    project = database.get("project", model["project"])
    slycat.web.server.authentication.require_project_writer(project)

    slycat.web.server.update_model(database, model, message="Storing data to array set %s." % (aid))

    if byteorder is None:
        data = json.load(data.file)
        data_iterator = iter(data)

    with slycat.web.server.hdf5.lock:
        with slycat.web.server.hdf5.open(model["artifact:%s" % aid], "r+") as file:
            hdf5_arrayset = slycat.hdf5.ArraySet(file)
            for array in slycat.hyperchunks.arrays(hyperchunks, hdf5_arrayset.array_count()):
                hdf5_array = hdf5_arrayset[array.index]
                for attribute in array.attributes(len(hdf5_array.attributes)):
                    if not isinstance(attribute.expression, slycat.hyperchunks.grammar.AttributeIndex):
                        raise cherrypy.HTTPError("400 Cannot assign data to computed attributes.")
                    for hyperslice in attribute.hyperslices():
                        cherrypy.log.error(
                            "Writing %s/%s/%s/%s" % (aid, array.index, attribute.expression.index, hyperslice))

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
                                    start, stop, step = hyperslice_dimension.indices(
                                        array_dimension["end"] - array_dimension["begin"])
                                    data_shape.append(stop - start)
                                else:
                                    slycat.email.send_error("slycat.web.server.handlers.py put_model_arrayset_data",
                                                            "Unexpected hyperslice: %s" % hyperslice_dimension)
                                    raise ValueError("Unexpected hyperslice: %s" % hyperslice_dimension)

                        # Convert data to an array ...
                        data_type = slycat.hdf5.dtype(hdf5_array.attributes[attribute.expression.index]["type"])
                        data_size = numpy.prod(data_shape)

                        if byteorder is None:
                            hyperslice_data = numpy.array(data_iterator.next(), dtype=data_type).reshape(data_shape)
                        elif byteorder == sys.byteorder:
                            hyperslice_data = numpy.fromfile(data.file, dtype=data_type, count=data_size).reshape(
                                data_shape)
                        else:
                            slycat.email.send_error("slycat.web.server.handlers.py put_model_arrayset_data",
                                                    "Not implemented error.")
                            raise NotImplementedError()

                        hdf5_array.set_data(attribute.expression.index, hyperslice, hyperslice_data)


def delete_model(mid):
    couchdb = slycat.web.server.database.couchdb.connect()
    model = couchdb.get("model", mid)
    project = couchdb.get("project", model["project"])
    slycat.web.server.authentication.require_project_writer(project)

    couchdb.delete(model)
    slycat.web.server.cleanup.arrays()

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

    slycat.email.send_error("slycat.web.server.handlers.py delete_project_cache_object", "cherrypy.HTTPError 404")
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
        raise cherrypy.HTTPError(
            "400 Malformed ranges argument must be a comma separated collection of half-open index ranges.")

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

            if not (0 <= attribute and attribute < len(hdf5_array.attributes)):
                raise cherrypy.HTTPError("400 Attribute argument out-of-range.")
            if len(ranges) != hdf5_array.ndim:
                raise cherrypy.HTTPError("400 Ranges argument doesn't contain the correct number of dimensions.")

            ranges = [(max(dimension["begin"], range[0]), min(dimension["end"], range[1])) for dimension, range in
                      zip(hdf5_array.dimensions, ranges)]
            index = tuple([slice(begin, end) for begin, end in ranges])

            attribute_type = hdf5_array.attributes[attribute]["type"]
            data = hdf5_array.get_data(attribute)[index]

            if byteorder is None:
                return json.dumps(data.tolist())
            else:
                if sys.byteorder != byteorder:
                    return data.byteswap().tostring(order="C")
                else:
                    return data.tostring(order="C")


@cherrypy.tools.json_out(on=True)
def get_model_arrayset_metadata(mid, aid, **kwargs):
    cherrypy.log.error("GET arrayset metadata mid:%s aid:%s kwargs:%s" % (mid, aid, kwargs.keys()))
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    project = database.get("project", model["project"])
    slycat.web.server.authentication.require_project_reader(project)

    artifact = model.get("artifact:%s" % aid, None)
    if artifact is None:
        slycat.email.send_error("slycat.web.server.handlers.py get_model_arrayset_metadata",
                                "cherrypy.HTTPError 404 artifact is None for aid: %s" % aid)
        raise cherrypy.HTTPError(404)
    artifact_type = model["artifact-types"][aid]
    if artifact_type not in ["hdf5"]:
        slycat.email.send_error("slycat.web.server.handlers.py get_model_arrayset_metadata",
                                "cherrypy.HTTPError 400 %s is not an array artifact." % aid)
        raise cherrypy.HTTPError("400 %s is not an array artifact." % aid)

    try:
        arrays = slycat.hyperchunks.parse(kwargs["arrays"]) if "arrays" in kwargs else None
    except:
        slycat.email.send_error("slycat.web.server.handlers.py get_model_arrayset_metadata",
                                "cherrypy.HTTPError 400 not a valid hyperchunks specification.")
        raise cherrypy.HTTPError("400 Not a valid hyperchunks specification.")

    try:
        statistics = slycat.hyperchunks.parse(kwargs["statistics"]) if "statistics" in kwargs else None
    except:
        slycat.email.send_error("slycat.web.server.handlers.py get_model_arrayset_metadata",
                                "cherrypy.HTTPError 400 not a valid hyperchunks specification.")
        raise cherrypy.HTTPError("400 Not a valid hyperchunks specification.")

    try:
        unique = slycat.hyperchunks.parse(kwargs["unique"]) if "unique" in kwargs else None
    except:
        slycat.email.send_error("slycat.web.server.handlers.py get_model_arrayset_metadata",
                                "cherrypy.HTTPError 400 not a valid hyperchunks specification.")
        raise cherrypy.HTTPError("400 Not a valid hyperchunks specification.")
    cherrypy.log.error("GET arrayset metadata arrays:%s stats:%s unique:%s" % (arrays, statistics, unique))
    results = slycat.web.server.get_model_arrayset_metadata(database, model, aid, arrays, statistics, unique)
    cherrypy.log.error("looking for unique in results")
    if "unique" in results:
        cherrypy.log.error("found unique in results")
        for unique in results["unique"]:
            unique["values"] = [array.tolist() for array in unique["values"]]
    cherrypy.log.error("returning results")

    return results


def get_model_arrayset_data(mid, aid, hyperchunks, byteorder=None):
    cherrypy.log.error(
        "GET Model Arrayset Data: arrayset %s hyperchunks %s byteorder %s" % (aid, hyperchunks, byteorder))
    try:
        hyperchunks = slycat.hyperchunks.parse(hyperchunks)
    except Exception as e:
        slycat.email.send_error("slycat.web.server.handlers.py get_model_arrayset_data",
                                "cherrypy.HTTPError 400 not a valid hyperchunks specification.")
        raise cherrypy.HTTPError("400 Not a valid hyperchunks specification.%s%s" % (e, traceback.print_exc()))

    if byteorder is not None:
        if byteorder not in ["big", "little"]:
            slycat.email.send_error("slycat.web.server.handlers.py get_model_arrayset_data",
                                    "cherrypy.HTTPError 400 optional byteorder argument must be big or little.")
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
        slycat.email.send_error("slycat.web.server.handlers.py get_model_arrayset_data", "cherrypy.HTTPError 404")
        raise cherrypy.HTTPError(404)
    artifact_type = model["artifact-types"][aid]
    if artifact_type not in ["hdf5"]:
        slycat.email.send_error("slycat.web.server.handlers.py get_model_arrayset_data",
                                "cherrypy.HTTPError 400 %s is not an array artifact." % aid)
        raise cherrypy.HTTPError("400 %s is not an array artifact." % aid)

    def mask_nans(array):
        """Convert an array containing nans into a masked array."""
        try:
            return numpy.ma.masked_where(numpy.isnan(array), array)
        except:
            return array

    def content():
        if byteorder is None:
            yield json.dumps([mask_nans(hyperslice).tolist() for hyperslice in
                              slycat.web.server.get_model_arrayset_data(database, model, aid, hyperchunks)])
        else:
            for hyperslice in slycat.web.server.get_model_arrayset_data(database, model, aid, hyperchunks):
                if sys.byteorder != byteorder:
                    yield hyperslice.byteswap().tostring(order="C")
                else:
                    yield hyperslice.tostring(order="C")

    return content()


get_model_arrayset_data._cp_config = {"response.stream": True}


@cherrypy.tools.json_in(on=True)
def post_model_arrayset_data(mid, aid):
    """
  get the arrayset data based on aid, mid, byteorder, and hyperchunks

  requires hyperchunks to be included in the json payload

  :param mid: model id
  :param aid: artifact id
  :return: stream of data
  """
    # try and grab hyperchunk
    hyperchunks = None
    byteorder = None
    require_json_parameter("hyperchunks")
    cherrypy.log.error("parsing post arrayset data")
    hyperchunks = cherrypy.request.json["hyperchunks"]
    try:
        byteorder = cherrypy.request.json["byteorder"]
    except Exception as e:
        byteorder = None
        cherrypy.log.error("no byteorder provided moving on")

    # parse the hyperchunks
    cherrypy.log.error(
        "GET Model Arrayset Data: arrayset %s hyperchunks %s byteorder %s" % (aid, hyperchunks, byteorder))
    try:
        hyperchunks = slycat.hyperchunks.parse(hyperchunks)
    except:
        slycat.email.send_error("slycat.web.server.handlers.py get_model_arrayset_data",
                                "cherrypy.HTTPError 400 not a valid hyperchunks specification.")
        raise cherrypy.HTTPError("400 Not a valid hyperchunks specification.")
    cherrypy.log.error("GET Model Arrayset Data: arrayset %s hyperchunks calculated" % (aid))

    #
    if byteorder is not None:
        if byteorder not in ["big", "little"]:
            slycat.email.send_error("slycat.web.server.handlers.py get_model_arrayset_data",
                                    "cherrypy.HTTPError 400 optional byteorder argument must be big or little.")
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
        slycat.email.send_error("slycat.web.server.handlers.py get_model_arrayset_data", "cherrypy.HTTPError 404")
        raise cherrypy.HTTPError(404)
    artifact_type = model["artifact-types"][aid]
    if artifact_type not in ["hdf5"]:
        slycat.email.send_error("slycat.web.server.handlers.py get_model_arrayset_data",
                                "cherrypy.HTTPError 400 %s is not an array artifact." % aid)
        raise cherrypy.HTTPError("400 %s is not an array artifact." % aid)

    def mask_nans(array):
        """Convert an array containing nans into a masked array."""
        try:
            return numpy.ma.masked_where(numpy.isnan(array), array)
        except:
            return array

    def content():
        if byteorder is None:
            yield json.dumps([mask_nans(hyperslice).tolist() for hyperslice in
                              slycat.web.server.get_model_arrayset_data(database, model, aid, hyperchunks)])
        else:
            for hyperslice in slycat.web.server.get_model_arrayset_data(database, model, aid, hyperchunks):
                if sys.byteorder != byteorder:
                    yield hyperslice.byteswap().tostring(order="C")
                else:
                    yield hyperslice.tostring(order="C")

    cherrypy.log.error("GET Model Arrayset Data: arrayset %s starting to get content" % (aid))
    return content()


# TODO: streaming was turned off because this is now a post, in the future we may wan to turn this back on to increase speed
# post_model_arrayset_data._cp_config = {"response.stream" : True}

def validate_table_rows(rows):
    try:
        rows = [spec.split("-") for spec in rows.split(",")]
        rows = [(int(spec[0]), int(spec[1]) if len(spec) == 2 else int(spec[0]) + 1) for spec in rows]
        rows = numpy.concatenate([numpy.arange(begin, end) for begin, end in rows])
        return rows
    except:
        slycat.email.send_error("slycat.web.server.handlers.py validate_table_rows",
                                "cherrypy.HTTPError 400 malformed rows argument must be a comma separated collection of row indices or half-open index ranges.")
        raise cherrypy.HTTPError(
            "400 Malformed rows argument must be a comma separated collection of row indices or half-open index ranges.")

    if numpy.any(rows < 0):
        slycat.email.send_error("slycat.web.server.handlers.py validate_table_rows",
                                "cherrypy.HTTPError 400 row values must be non-negative.")
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
        slycat.email.send_error("slycat.web.server.handlers.py validate_table_columns",
                                "cherrypy.HTTPError 400 malformed columns argument must be a comma separated collection of column indices or half-open index ranges.")
        raise cherrypy.HTTPError(
            "400 Malformed columns argument must be a comma separated collection of column indices or half-open index ranges.")

    if numpy.any(columns < 0):
        slycat.email.send_error("slycat.web.server.handlers.py validate_table_columns",
                                "cherrypy.HTTPError 400 column values must be non-negative.")
        raise cherrypy.HTTPError("400 Column values must be non-negative.")

    return columns


def validate_table_sort(sort):
    if sort is not None:
        try:
            sort = [spec.split(":") for spec in sort.split(",")]
            sort = [(column, order) for column, order in sort]
        except:
            slycat.email.send_error("slycat.web.server.handlers.py validate_table_sort",
                                    "cherrypy.HTTPError 400 malformed order argument must be a comma separated collection of column:order tuples.")
            raise cherrypy.HTTPError(
                "400 Malformed order argument must be a comma separated collection of column:order tuples.")

        try:
            sort = [(int(column), order) for column, order in sort]
        except:
            slycat.email.send_error("slycat.web.server.handlers.py validate_table_sort",
                                    "cherrypy.HTTPError 400 sort column must be an integer.")
            raise cherrypy.HTTPError("400 Sort column must be an integer.")

        for column, order in sort:
            if column < 0:
                slycat.email.send_error("slycat.web.server.handlers.py validate_table_sort",
                                        "cherrypy.HTTPError 400 sort column must be non-negative.")
                raise cherrypy.HTTPError("400 Sort column must be non-negative.")
            if order not in ["ascending", "descending"]:
                slycat.email.send_error("slycat.web.server.handlers.py validate_table_sort",
                                        "cherrypy.HTTPError 400 sort-order must be 'ascending' or 'descending'")
                raise cherrypy.HTTPError("400 Sort-order must be 'ascending' or 'descending'.")

        if len(sort) != 1:
            slycat.email.send_error("slycat.web.server.handlers.py validate_table_sort",
                                    "cherrypy.HTTPError 400 currently, only one column can be sorted.")
            raise cherrypy.HTTPError("400 Currently, only one column can be sorted.")

    return sort


def validate_table_byteorder(byteorder):
    if byteorder is not None:
        if byteorder not in ["little", "big"]:
            slycat.email.send_error("slycat.web.server.handlers.py validate_table_sort",
                                    "cherrypy.HTTPError 400 malformed byteorder argument must be 'little' or 'big'.")
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
        if index is not None and sort_column == metadata["column-count"] - 1:
            pass  # At this point, the sort index is already set from above
        else:
            index_key = "array/%s/index/%s" % (array_index, sort_column)
            if index_key not in file:
                # cherrypy.log.error("Caching array index for file %s array %s attribute %s" % (file.filename, array_index, sort_column))
                sort_index = numpy.argsort(slycat.hdf5.ArraySet(file)[array_index].get_data(sort_column)[...],
                                           kind="mergesort")
                file[index_key] = sort_index
            else:
                # cherrypy.log.error("Loading cached sort index.")
                sort_index = file[index_key][...]
        if sort_order == "descending":
            sort_index = sort_index[::-1]
    return sort_index


def get_table_metadata(file, array_index, index):
    """Return table-oriented metadata for a 1D array, plus an optional index column."""
    arrayset = slycat.hdf5.ArraySet(file)
    array = arrayset[array_index]

    if array.ndim != 1:
        slycat.email.send_error("slycat.web.server.handlers.py get_table_metadata",
                                "cherrypy.HTTPError 400 not a table (1D array) artifact.")
        raise cherrypy.HTTPError("400 Not a table (1D array) artifact.")

    dimensions = array.dimensions
    attributes = array.attributes
    statistics = [array.get_statistics(attribute) for attribute in range(len(attributes))]

    metadata = {
        "row-count": dimensions[0]["end"] - dimensions[0]["begin"],
        "column-count": len(attributes),
        "column-names": [attribute["name"] for attribute in attributes],
        "column-types": [attribute["type"] for attribute in attributes],
        "column-min": [attribute["min"] for attribute in statistics],
        "column-max": [attribute["max"] for attribute in statistics]
    }

    if index is not None:
        metadata["column-count"] += 1
        metadata["column-names"].append(index)
        metadata["column-types"].append("int64")
        metadata["column-min"].append(0)
        metadata["column-max"].append(metadata["row-count"] - 1)

    return metadata


@cherrypy.tools.json_out(on=True)
def get_model_table_metadata(mid, aid, array, index=None):
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    project = database.get("project", model["project"])
    slycat.web.server.authentication.require_project_reader(project)

    artifact = model.get("artifact:%s" % aid, None)
    if artifact is None:
        slycat.email.send_error("slycat.web.server.handlers.py get_model_table_metadata",
                                "cherrypy.HTTPError 404 artifact is None for aid: %s" % aid)
        raise cherrypy.HTTPError(404)
    artifact_type = model["artifact-types"][aid]
    if artifact_type not in ["hdf5"]:
        slycat.email.send_error("slycat.web.server.handlers.py get_model_table_metadata",
                                "cherrypy.HTTPError 400 %s is not an array artifact." % aid)
        raise cherrypy.HTTPError("400 %s is not an array artifact." % aid)

    with slycat.web.server.hdf5.lock:
        with slycat.web.server.hdf5.open(artifact,
                                         "r+") as file:  # We have to open the file with writing enabled because the statistics cache may need to be updated.
            metadata = get_table_metadata(file, array, index)
        return metadata


@cherrypy.tools.json_out(on=True)
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
        slycat.email.send_error("slycat.web.server.handlers.py get_model_table_chunk",
                                "cherrypy.HTTPError 404 artifact is None for aid: %s" % aid)
        raise cherrypy.HTTPError(404)
    artifact_type = model["artifact-types"][aid]
    if artifact_type not in ["hdf5"]:
        slycat.email.send_error("slycat.web.server.handlers.py get_model_table_chunk",
                                "cherrypy.HTTPError 400 %s is not an array artifact." % aid)
        raise cherrypy.HTTPError("400 %s is not an array artifact." % aid)

    with slycat.web.server.hdf5.lock:
        with slycat.web.server.hdf5.open(artifact, mode="r+") as file:
            metadata = get_table_metadata(file, array, index)

            # Constrain end <= count along both dimensions
            rows = rows[rows < metadata["row-count"]]
            if numpy.any(columns >= metadata["column-count"]):
                slycat.email.send_error("slycat.web.server.handlers.py get_model_table_chunk",
                                        "cherrypy.HTTPError 400 column out-of-range.")
                raise cherrypy.HTTPError("400 Column out-of-range.")
            if sort is not None:
                for column, order in sort:
                    if column >= metadata["column-count"]:
                        slycat.email.send_error("slycat.web.server.handlers.py get_model_table_chunk",
                                                "400 sort column out-of-range.")
                        raise cherrypy.HTTPError("400 Sort column out-of-range.")

            # Retrieve the data
            data = []
            sort_index = get_table_sort_index(file, metadata, array, sort, index)
            slice = sort_index[rows]
            slice_index = numpy.argsort(slice, kind="mergesort")
            slice_reverse_index = numpy.argsort(slice_index, kind="mergesort")
            for column in columns:
                type = metadata["column-types"][column]
                if index is not None and column == metadata["column-count"] - 1:
                    values = slice.tolist()
                else:
                    values = slycat.hdf5.ArraySet(file)[array].get_data(column)[slice[slice_index].tolist()][
                        slice_reverse_index].tolist()
                    if type in ["float32", "float64"]:
                        values = [None if numpy.isnan(value) else value for value in values]
                data.append(values)

            result = {
                "rows": rows.tolist(),
                "columns": columns.tolist(),
                "column-names": [metadata["column-names"][column] for column in columns],
                "data": data,
                "sort": sort
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
        slycat.email.send_error("slycat.web.server.handlers.py get_model_table_sorted_indices",
                                "cherrypy.HTTPError 404 artifact is None for aid: %s" % aid)
        raise cherrypy.HTTPError(404)
    artifact_type = model["artifact-types"][aid]
    if artifact_type not in ["hdf5"]:
        slycat.email.send_error("slycat.web.server.handlers.py get_model_table_sorted_indices",
                                "cherrypy.HTTPError 400 %s is not an array artifact." % aid)
        raise cherrypy.HTTPError("400 %s is not an array artifact." % aid)

    with slycat.web.server.hdf5.lock:
        with slycat.web.server.hdf5.open(artifact, mode="r+") as file:
            metadata = get_table_metadata(file, array, index)

            # Constrain end <= count along both dimensions
            rows = rows[rows < metadata["row-count"]]
            if sort is not None:
                for column, order in sort:
                    if column >= metadata["column-count"]:
                        slycat.email.send_error("slycat.web.server.handlers.py get_model_table_sorted_indices",
                                                "cherrypy.HTTPError 400 sort column out-of-range.")
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
        slycat.email.send_error("slycat.web.server.handlers.py get_model_table_unsorted_indices",
                                "cherrypy.HTTPError 404 artifact is None for aid: %s" % aid)
        raise cherrypy.HTTPError(404)
    artifact_type = model["artifact-types"][aid]
    if artifact_type not in ["hdf5"]:
        slycat.email.send_error("slycat.web.server.handlers.py get_model_table_unsorted_indices",
                                "cherrypy.HTTPError 400 %s is not an array artifact." % aid)
        raise cherrypy.HTTPError("400 %s is not an array artifact." % aid)

    with slycat.web.server.hdf5.lock:
        with slycat.web.server.hdf5.open(artifact, mode="r+") as file:
            metadata = get_table_metadata(file, array, index)

            # Constrain end <= count along both dimensions
            rows = rows[rows < metadata["row-count"]]
            if sort is not None:
                for column, order in sort:
                    if column >= metadata["column-count"]:
                        slycat.email.send_error("slycat.web.server.handlers.py get_model_table_unsorted_indices",
                                                "cherrypy.HTTPError 400 sort column out-of-range.")
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
        slycat.email.send_error("slycat.web.server.handlers.py get_model_file",
                                "cherrypy.HTTPError 404 artifact is None for aid: %s" % aid)
        raise cherrypy.HTTPError(404)
    artifact_type = model["artifact-types"][aid]
    if artifact_type != "file":
        slycat.email.send_error("slycat.web.server.handlers.py get_model_file",
                                "cherrypy.HTTPError 400 %s is not a file artifact." % aid)
        raise cherrypy.HTTPError("400 %s is not a file artifact." % aid)
    fid = artifact

    cherrypy.response.headers["content-type"] = model["_attachments"][fid]["content_type"]
    return database.get_attachment(mid, fid)


@cherrypy.tools.json_out(on=True)
def get_model_parameter(mid, aid):
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    project = database.get("project", model["project"])
    slycat.web.server.authentication.require_project_reader(project)

    try:
        return slycat.web.server.get_model_parameter(database, model, aid)
    except KeyError as e:
        slycat.email.send_error("slycat.web.server.handlers.py get_model_parameter",
                                "cherrypy.HTTPError 404 unknown artifact: %s" % aid)
        raise cherrypy.HTTPError("404 Unknown artifact: %s" % aid)


def get_bookmark(bid):
    accept = cherrypy.lib.cptools.accept(media=["application/json"])

    database = slycat.web.server.database.couchdb.connect()
    bookmark = database.get("bookmark", bid)
    project = database.get("project", bookmark["project"])
    slycat.web.server.authentication.require_project_reader(project)

    cherrypy.response.headers["content-type"] = accept
    return database.get_attachment(bookmark, "bookmark")


@cherrypy.tools.json_out(on=True)
def get_user(uid):
    if uid == "-":
        uid = cherrypy.request.login
    user = cherrypy.request.app.config["slycat-web-server"]["directory"](uid)
    if user is None:
        slycat.email.send_error("slycat.web.server.handlers.py get_user",
                                "cherrypy.HTTPError 404 user is None for uid: %s" % uid)
        raise cherrypy.HTTPError(404)
    # Add the uid to the record, since the caller may not know it.
    user["uid"] = uid
    return user


@cherrypy.tools.json_out(on=True)
def get_model_statistics(mid):
    """
  returns statistics on the model
  :param mid: model ID
  :return json: {
    "mid":mid,
    "hdf5_file_size":hdf5_file_size,
    "total_server_data_size": total_server_data_size,
    "hdf5_store_size":total_hdf5_server_size,
    "model":model,
    "delta_creation_time":delta_creation_time,
    "couchdb_doc_size": sys.getsizeof(model)
  }
  """
    database = slycat.web.server.database.couchdb.connect()
    try:
        model = database.get("model", mid)
        project = database.get("project", model["project"])
    except:
        raise cherrypy.HTTPError("404 error: %s" % mid)
    slycat.web.server.authentication.require_project_reader(project)

    # amount of time it took to make the model
    delta_creation_time = (
        datetime.datetime.strptime(model["finished"], "%Y-%m-%dT%H:%M:%S.%f") - datetime.datetime.strptime(
            model["created"],
            "%Y-%m-%dT%H:%M:%S.%f")).total_seconds()

    if "job_running_time" in model and "job_submit_time" in model:
        delta_queue_time = (
            datetime.datetime.strptime(model["job_running_time"], "%Y-%m-%dT%H:%M:%S.%f") - datetime.datetime.strptime(
                model["job_submit_time"], "%Y-%m-%dT%H:%M:%S.%f")).total_seconds()
    else:
        delta_queue_time = 0

    if "job_completed_time" in model and "job_running_time" in model:
        delta_running_time = (
            datetime.datetime.strptime(model["job_completed_time"],
                                       "%Y-%m-%dT%H:%M:%S.%f") - datetime.datetime.strptime(
                model["job_running_time"], "%Y-%m-%dT%H:%M:%S.%f")).total_seconds()
        delta_model_compute_time = (
            datetime.datetime.strptime(model["finished"], "%Y-%m-%dT%H:%M:%S.%f") - datetime.datetime.strptime(
                model["model_compute_time"], "%Y-%m-%dT%H:%M:%S.%f")).total_seconds()
    elif "job_completed_time" in model:
        delta_running_time = (
            datetime.datetime.strptime(model["job_completed_time"],
                                       "%Y-%m-%dT%H:%M:%S.%f") - datetime.datetime.strptime(
                model["finished"], "%Y-%m-%dT%H:%M:%S.%f")).total_seconds()
        delta_model_compute_time = 0
    else:
        delta_running_time = 0
        delta_model_compute_time = 0

    # get hdf5 root dir
    hdf5_root_directory = cherrypy.tree.apps[""].config["slycat-web-server"]["data-store"]

    # get models hdf5 footprint
    hdf5_file_size = 0
    for key, value in model["artifact-types"].iteritems():
        if value == "hdf5":
            array = model["artifact:%s" % key]
            hdf5_file_path = os.path.join(hdf5_root_directory, array[0:2], array[2:4], array[4:6], array + ".hdf5")
            hdf5_file_size += os.path.getsize(hdf5_file_path)

    # calc total model server data footprint
    total_server_data_size = hdf5_file_size + sys.getsizeof(model)

    # get total hdf5 file store size for server
    total_hdf5_server_size = 0
    for dirpath, dirnames, filenames in os.walk(hdf5_root_directory):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            total_hdf5_server_size += os.path.getsize(fp)

    try:
        server_cache_size = float(sys.getsizeof(cPickle.dumps(slycat.web.server.server_cache.cache))) / 1024.0 / 1024.0
    except:
        server_cache_size = 0

    return {
        "server_cache_size": server_cache_size,
        "mid": mid,
        "hdf5_file_size": float(hdf5_file_size) / 1024.0 / 1024.0,
        "total_server_data_size": float(total_server_data_size) / 1024.0 / 1024.0,
        "hdf5_store_size": float(total_hdf5_server_size) / 1024.0 / 1024.0,
        "model": model,
        "delta_creation_time": float(delta_creation_time) / 60,
        "couchdb_doc_size": sys.getsizeof(model) / 1024.0 / 1024.0,
        "hdf5_footprint": 100.0 * (float(hdf5_file_size) / float(total_hdf5_server_size)),
        "job_pending_time": float(delta_queue_time) / 60,
        "job_running_time": float(delta_running_time) / 60,
        "model_compute_time": float(delta_model_compute_time) / 60,
        "analysis_computation_time": 0.0 if "analysis_computation_time" not in model else float(
            model["analysis_computation_time"]),
        "db_creation_time": 0.0 if "db_creation_time" not in model else float(model["db_creation_time"])
    }


@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def post_remotes():
    """
      Given username, hostname, password as a json payload
      establishes a session with the remote host and attaches
      it to the users session
      :return: {"sid":sid, "status":boolean, msg:""}
    """
    username = cherrypy.request.json["username"]
    hostname = cherrypy.request.json["hostname"]
    password = cherrypy.request.json["password"]
    agent = cherrypy.request.json.get("agent", None)
    sid = slycat.web.server.remote.create_session(hostname, username, password, agent)
    '''
    save sid to user session
    the session will be stored as follows in the users session
    {sessions:[{{"sid": sid,"hostname": hostname, "username": username}},...]}
    '''
    try:
        database = slycat.web.server.database.couchdb.connect()
        session = database.get("session", cherrypy.request.cookie["slycatauth"].value)
        hostname_not_found = True
        for i in xrange(len(session["sessions"])):
            if session["sessions"][i]["hostname"] == hostname:
                session["sessions"][i]["sid"] = sid
                session["sessions"][i]["username"] = username
                hostname_not_found = False
        if hostname_not_found:
            session["sessions"].append({"sid": sid, "hostname": hostname, "username": username})
        database.save(session)
    except Exception as e:
        cherrypy.log.error("login could not save session for remotes %s" % e)
    return {"sid": sid, "status": True, "msg": ""}


@cherrypy.tools.json_out(on=True)
def get_remotes(hostname):
    """
  Returns {status: True} if the hostname was found in the user's
  session
  :param hostname: connection host name
  :return: {"status":status, "msg":msg}
  """
    status = False
    msg = "hostname session not found"
    try:
        database = slycat.web.server.database.couchdb.connect()
        session = database.get("session", cherrypy.request.cookie["slycatauth"].value)
        for h_session in session["sessions"]:
            if h_session["hostname"] == hostname:
                if slycat.web.server.remote.check_session(h_session["sid"]):
                    status = True
                    msg = "hostname session was found"
                else:
                    session["sessions"][:] = [tup for tup in session["sessions"] if tup["hostname"] != hostname]
                    database.save(session)
    except Exception as e:
        cherrypy.log.error("status could not save session for remotes %s" % e)
    return {"status": status, "msg": msg}


def delete_remote(sid):
    slycat.web.server.remote.delete_session(sid)
    cherrypy.response.status = "204 Remote deleted."


@cherrypy.tools.json_out(on=True)
def get_session_status(hostname):
    sid = get_sid(hostname)
    with slycat.web.server.remote.get_session(sid) as session:
        return "success"


@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def post_remote_launch(hostname):
    sid = get_sid(hostname)
    command = cherrypy.request.json["command"]
    with slycat.web.server.remote.get_session(sid) as session:
        return session.launch(command)


@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def post_submit_batch(hostname):
    sid = get_sid(hostname)
    filename = cherrypy.request.json["filename"]
    with slycat.web.server.remote.get_session(sid) as session:
        return session.submit_batch(filename)


@cherrypy.tools.json_out(on=True)
def get_checkjob(hostname, jid):
    sid = get_sid(hostname)
    with slycat.web.server.remote.get_session(sid) as session:
        return session.checkjob(jid)


@cherrypy.tools.json_out(on=True)
def delete_job(hostname, jid):
    sid = get_sid(hostname)
    with slycat.web.server.remote.get_session(sid) as session:
        return session.cancel_job(jid)


@cherrypy.tools.json_out(on=True)
def get_job_output(hostname, jid, path):
    sid = get_sid(hostname)
    with slycat.web.server.remote.get_session(sid) as session:
        return session.get_job_output(jid, path)


@cherrypy.tools.json_out(on=True)
def get_user_config(hostname):
    sid = get_sid(hostname)
    with slycat.web.server.remote.get_session(sid) as session:
        return session.get_user_config()


@cherrypy.tools.json_out(on=True)
def job_time(nodes, tasks, size):
    """
    gives the time in seconds recommended given job meta data
    :param nodes: number of hpc nodes for job
    :param tasks: number of tasks per node for job
    :param size: size of data file used in the job
    :return: json time in seconds as an integer {'time-seconds': 1800}
    """
    time = (18 * float(size)) / (float(nodes) * float(tasks))
    return {
            'time-seconds': int(time),
            'nodes': nodes,
            'tasks': tasks,
            'size': size}  # return an approximation based on size, nodes, and tasks for now


@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def set_user_config(hostname):
    sid = get_sid(hostname)
    config = cherrypy.request.json["config"]
    with slycat.web.server.remote.get_session(sid) as session:
        return session.set_user_config(config)


@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def run_agent_function(hostname):
    sid = get_sid(hostname)
    wckey = cherrypy.request.json["wckey"]
    nnodes = cherrypy.request.json["nnodes"]
    partition = cherrypy.request.json["partition"]
    ntasks_per_node = cherrypy.request.json["ntasks_per_node"]
    # ntasks = cherrypy.request.json["ntasks"]
    # ncpu_per_task = cherrypy.request.json["ncpu_per_task"]
    time_hours = cherrypy.request.json["time_hours"]
    time_minutes = cherrypy.request.json["time_minutes"]
    time_seconds = cherrypy.request.json["time_seconds"]
    fn = cherrypy.request.json["fn"]
    fn_params = cherrypy.request.json["fn_params"]
    uid = cherrypy.request.json["uid"]
    with slycat.web.server.remote.get_session(sid) as session:
        return session.run_agent_function(wckey, nnodes, partition, ntasks_per_node, time_hours, time_minutes,
                                          time_seconds, fn, fn_params, uid)


@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def post_remote_browse(hostname, path):
    sid = get_sid(hostname)
    file_reject = re.compile(
        cherrypy.request.json.get("file-reject")) if "file-reject" in cherrypy.request.json else None
    file_allow = re.compile(cherrypy.request.json.get("file-allow")) if "file-allow" in cherrypy.request.json else None
    directory_reject = re.compile(
        cherrypy.request.json.get("directory-reject")) if "directory-reject" in cherrypy.request.json else None
    directory_allow = re.compile(
        cherrypy.request.json.get("directory-allow")) if "directory-allow" in cherrypy.request.json else None

    with slycat.web.server.remote.get_session(sid) as session:
        return session.browse(path, file_reject, file_allow, directory_reject, directory_allow)


def get_remote_file(hostname, path, **kwargs):
    """
  Given a hostname and file path returns the file given
  by the path
  :param hostname: connection host name
  :param path: path to file
  :param kwargs:
  :return: file
  """
    sid = get_sid(hostname)
    with slycat.web.server.remote.get_session(sid) as session:
        return session.get_file(path, **kwargs)


def get_remote_image(hostname, path, **kwargs):
    """
  Given a hostname and image path returns the image given
  by the path
  :param hostname: connection host name
  :param path: path to image
  :param kwargs:
  :return: image
  """
    sid = get_sid(hostname)
    with slycat.web.server.remote.get_session(sid) as session:
        return session.get_image(path, **kwargs)


@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def post_remote_videos(sid):
    if "content-type" not in cherrypy.request.json:
        slycat.email.send_error("slycat.web.server.handlers.py post_remote_videos",
                                "cherrypy.HTTPError 400 missing content-type.")
        raise cherrypy.HTTPError("400 Missing content-type.")
    if "images" not in cherrypy.request.json:
        slycat.email.send_error("slycat.web.server.handlers.py post_remote_videos",
                                "cherrypy.HTTPError 400 missing images.")
        raise cherrypy.HTTPError("400 Missing images.")

    with slycat.web.server.remote.get_session(sid) as session:
        return session.post_video(cherrypy.request.json["content-type"], cherrypy.request.json["images"])


@cherrypy.tools.json_out(on=True)
def get_remote_video_status(hostname, vsid):
    """
  Given a hostname and vsid returns the video status given
  by the vsid
  :param hostname: connection host name
  :param vsid: video uuid
  :return: json
  """
    sid = get_sid(hostname)
    with slycat.web.server.remote.get_session(sid) as session:
        return session.get_video_status(vsid)


def get_remote_video(hostname, vsid):
    """
  Given a hostname and vsid returns the video given
  by the vsid
  :param hostname: connection host name
  :param vsid: video uuid
  :return: video
  """
    sid = get_sid(hostname)
    with slycat.web.server.remote.get_session(sid) as session:
        return session.get_video(vsid)


def post_events(event):
    # We don't actually have to do anything here, since the request is already logged.
    cherrypy.response.status = "204 Event logged."


@cherrypy.tools.json_out(on=True)
def get_configuration_markings():
    return [dict(marking.items() + [("type", key)]) for key, marking in
            slycat.web.server.plugin.manager.markings.items() if
            key in cherrypy.request.app.config["slycat-web-server"]["allowed-markings"]]


@cherrypy.tools.json_out(on=True)
def get_configuration_parsers():
    return [{"type": key, "label": parser["label"], "categories": parser["categories"]} for key, parser in
            slycat.web.server.plugin.manager.parsers.items()]


@cherrypy.tools.json_out(on=True)
def get_configuration_remote_hosts():
    remote_hosts = []
    for hostname, remote in cherrypy.request.app.config["slycat-web-server"]["remote-hosts"].items():
        agent = True if remote.get("agent", False) else False
        remote_hosts.append({"hostname": hostname, "agent": agent})
    return remote_hosts


@cherrypy.tools.json_out(on=True)
def get_configuration_support_email():
    return cherrypy.request.app.config["slycat-web-server"]["support-email"]


@cherrypy.tools.json_out(on=True)
def get_configuration_version():
    with get_configuration_version.lock:
        if not get_configuration_version.initialized:
            get_configuration_version.initialized = True
            try:
                get_configuration_version.commit = \
                    subprocess.Popen(["git", "rev-parse", "HEAD"], cwd=os.path.dirname(__file__),
                                     stdout=subprocess.PIPE).communicate()[0].strip()
            except:
                pass
    return {"version": slycat.__version__, "commit": get_configuration_version.commit}


get_configuration_version.lock = threading.Lock()
get_configuration_version.initialized = False
get_configuration_version.commit = None


@cherrypy.tools.json_out(on=True)
def get_configuration_wizards():
    return [dict([("type", type)] + wizard.items()) for type, wizard in
            slycat.web.server.plugin.manager.wizards.items()]


@cherrypy.tools.expires(on=True, force=True, secs=60 * 60 * 24 * 30)
def get_global_resource(resource):
    if not get_global_resource._ready:
        with get_global_resource._lock:
            slycat.web.server.resource.manager.add_file("slycat-logo-navbar.png", "css/slycat-logo-navbar.png")
            get_global_resource._ready = True
    if resource in slycat.web.server.resource.manager.bundles:
        content_type, content = slycat.web.server.resource.manager.bundles[resource]
        cherrypy.response.headers["content-type"] = content_type
        return content
    if resource in slycat.web.server.resource.manager.files:
        return cherrypy.lib.static.serve_file(slycat.web.server.resource.manager.files[resource])

    slycat.email.send_error("slycat.web.server.handlers.py get_global_resource",
                            "cherrypy.HTTPError 404 invalid resource: %s" % resource)
    raise cherrypy.HTTPError(404)


get_global_resource._lock = threading.Lock()
get_global_resource._ready = False


def tests_request(*arguments, **keywords):
    cherrypy.log.error("Request: %s" % cherrypy.request.request_line)
    cherrypy.log.error("  Remote IP: %s" % cherrypy.request.remote.ip)
    cherrypy.log.error("  Remote Port: %s" % cherrypy.request.remote.port)
    cherrypy.log.error("  Remote Hostname: %s" % cherrypy.request.remote.name)
    cherrypy.log.error("  Scheme: %s" % cherrypy.request.scheme)
    for key, value in sorted(cherrypy.request.headers.items()):
        cherrypy.log.error("  Header: %s=%s" % (key, value))
    cherrypy.response.status = 200
