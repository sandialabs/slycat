# -*- coding: utf-8 -*- 
# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import traceback
import cherrypy
import hashlib
import itertools
import json
import logging.handlers
import numbers
import numpy
import os
import io
import time
import _pickle
import re
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
import slycat.web.server.smb
import slycat.web.server.streaming
import slycat.web.server.upload
import stat
import subprocess
import sys
import threading
import time
import uuid
import functools
import datetime
import h5py
import csv
import tempfile
from urllib.parse import urlparse, urlencode, parse_qs

# decode base64 byte streams for file upload
import base64

class MyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, numpy.integer):
            return int(obj)
        elif isinstance(obj, numpy.floating):
            return float(obj)
        elif isinstance(obj, numpy.ndarray):
            return obj.tolist()
        elif type(obj) is bytes:
            return str(obj.decode())
        else:
            return super(MyEncoder, self).default(obj)

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
        for index, host_session in enumerate(session["sessions"]):
            if host_session["hostname"] == hostname:
                sid = host_session["sid"]
                session_type = host_session["session_type"]
                if(host_session["session_type"] == "ssh" and not slycat.web.server.remote.check_session(sid)):
                    cherrypy.log.error("error %s SID:%s Keys %s" % (slycat.web.server.remote.check_session(sid), sid, list(slycat.web.server.remote.session_cache.keys())))
                    slycat.web.server.remote.delete_session(sid)
                    del session["sessions"][index]
                    database.save(session)
                    raise cherrypy.HTTPError("404")
                elif(host_session["session_type"] == "smb" and not slycat.web.server.smb.check_session(sid)):
                    cherrypy.log.error("error %s SID:%s Keys %s" % (slycat.web.server.smb.check_session(sid), sid, list(slycat.web.server.smb.session_cache.keys())))
                    slycat.web.server.smb.delete_session(sid)
                    del session["sessions"][index]
                    database.save(session)
                    raise cherrypy.HTTPError("404")
                break
    except Exception as e:
        cherrypy.log.error("could not retrieve host session for remotes %s" % e)
        raise cherrypy.HTTPError("404")
    if sid is None:
        raise cherrypy.HTTPError("400 session is None value")
    return sid, session_type


def require_json_parameter(name):
    """
      checks to see if the parameter is in the cherrypy.request.json
      and errors gracefully if it is not there
      :param name: name of json param
      :return: value of the json param
    """
    if name not in cherrypy.request.json:
        cherrypy.log.error("slycat.web.server.handlers.py require_json_parameter",
                                "cherrypy.HTTPError 404 missing '%s' parameter." % name)
        raise cherrypy.HTTPError("400 Missing '%s' parameter." % name)
    return cherrypy.request.json[name]


def require_boolean_json_parameter(name):
    value = require_json_parameter(name)
    if value is not True and value is not False:
        cherrypy.log.error("slycat.web.server.handlers.py require_boolean_json_parameter",
                                "cherrypy.HTTPError 400 '%s' parameter must be true or false." % name)
        raise cherrypy.HTTPError("400 '%s' parameter must be true or false." % name)
    return value


def require_array_json_parameter(name):
    array = require_json_parameter(name)
    if not isinstance(array, list):
        cherrypy.log.error("slycat.web.server.handlers.py require_array_json_parameter",
                                "cherrypy.HTTPError 400 '%s' parameter must be an array." % name)
        raise cherrypy.HTTPError("400 '%s' parameter must be an array." % name)
    return array


def require_integer_array_json_parameter(name):
    array = require_array_json_parameter(name)
    try:
        array = [int(value) for value in array]
    except:
        cherrypy.log.error("slycat.web.server.handlers.py require_integer_array_json_parameter",
                                "cherrypy.HTTPError 400 '%s' parameter must be an array of integers." % name)
        raise cherrypy.HTTPError("400 '%s' parameter must be an array of integers." % name)
    return array


def require_integer_parameter(value, name):
    try:
        return int(value)
    except:
        cherrypy.log.error("slycat.web.server.handlers.py require_integer_parameter",
                                "cherrypy.HTTPError 400 '%s' parameter must be an integer." % name)
        raise cherrypy.HTTPError("400 '%s' parameter must be an integer." % name)

@cherrypy.tools.json_out(on=True)
def get_last_active_time():
    """
    Checks when the most recent session activity occured.
    If it occured more than 10 minutes ago, returns true.
    If less than 10 minutes ago, returns false.
    """
    most_recent_time = datetime.timedelta(days=999)
    time_threshold = datetime.timedelta(minutes = 10)
    database = slycat.web.server.database.couchdb.connect()
    for session in database.view("slycat/sessions", include_docs=True):
        if session.doc["creator"] not in cherrypy.request.app.config["slycat"]["server-admins"] and (datetime.datetime.utcnow() - datetime.datetime.strptime(str(session.doc["last-active-time"]), '%Y-%m-%dT%H:%M:%S.%f')) < most_recent_time:
            most_recent_time = session.doc["last-active-time"]

    if (datetime.datetime.utcnow() - datetime.datetime.strptime(str(most_recent_time), '%Y-%m-%dT%H:%M:%S.%f')) >= time_threshold:
        return True
    else:
        return False

@cherrypy.tools.json_out(on=True)
def get_projects_list(_=None):
    """
    returns an array of projects
    :param _: time arg to stop caching
    :return: json projects list
    """
    database = slycat.web.server.database.couchdb.connect()
    projects = [project for project in database.scan("slycat/projects") if
                slycat.web.server.authentication.is_project_reader(
                    project) or slycat.web.server.authentication.is_project_writer(
                    project) or slycat.web.server.authentication.is_project_administrator(
                    project) or slycat.web.server.authentication.is_server_administrator()]
    projects = sorted(projects, key=lambda x: x["created"], reverse=True)
    return {"revision": 0, "projects": projects}


@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def post_projects():
    """
    creates a new project
    Raises:
      cherrypy.HTTPError -- if the project name is missing from the post json raises 400
    Returns:
      [json] -- project id that was created
    """
    if "name" not in cherrypy.request.json:
        raise cherrypy.HTTPError("400 Missing project name.")

    database = slycat.web.server.database.couchdb.connect()
    pid, rev = database.save({
        "type": "project",
        "acl": {"administrators": [{"user": cherrypy.request.login}], "readers": [], "writers": [], "groups": []},
        "created": datetime.datetime.utcnow().isoformat(),
        "creator": cherrypy.request.login,
        "description": cherrypy.request.json.get("description", ""),
        "name": cherrypy.request.json["name"]
    })
    cherrypy.response.headers["location"] = "%s/projects/%s" % (cherrypy.request.base, pid)
    cherrypy.response.status = "201 Project created."
    return {"id": pid}

@cherrypy.tools.json_out(on=True)
def get_project(pid):
    """
    returns a project based on "content-type" header
    :param pid: project ID
    :return: Either html landing page of given project or the json
    representation of the project
    """
    database = slycat.web.server.database.couchdb.connect()
    project = database.get("project", pid)
    slycat.web.server.authentication.require_project_reader(project)
    if slycat.web.server.authentication.is_server_administrator():
        project['acl']["server_administrators"] = []
        project['acl']["server_administrators"].append({'user':cherrypy.request.login})
    return project

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
def put_project(pid):
    """
    Takes json in the format of 
    acl:

    administrators: list of object 
    user:username

    writers: list of object
    user:username

    readers: list of object
    user:username

    name: string
    name of the project

    description: string
    description of the project, 
    and updates the project json from this object.
    all top order fields are optional

    Parameters
    ----------
      pid: string
           uui for project

    Raises
    ------
      cherrypy.HTTPError
        400 missing administrators
      cherrypy.HTTPError
        400 missing writers
      cherrypy.HTTPError
        400 missing readers
    """
    database = slycat.web.server.database.couchdb.connect()
    project = database.get("project", pid)
    slycat.web.server.authentication.require_project_writer(project)

    mutations = []
    if "acl" in cherrypy.request.json:
        slycat.web.server.authentication.require_project_administrator(project)
        if "server_administrators" in cherrypy.request.json["acl"]:
            del cherrypy.request.json["acl"]["server_administrators"]
        if "administrators" not in cherrypy.request.json["acl"]:
            cherrypy.log.error("slycat.web.server.handlers.py put_project",
                                    "cherrypy.HTTPError 400 missing administrators.")
            raise cherrypy.HTTPError("400 missing administrators")
        if "writers" not in cherrypy.request.json["acl"]:
            cherrypy.log.error("slycat.web.server.handlers.py put_project",
                                    "cherrypy.HTTPError 400 missing writers.")
            raise cherrypy.HTTPError("400 missing writers")
        if "readers" not in cherrypy.request.json["acl"]:
            cherrypy.log.error("slycat.web.server.handlers.py put_project",
                                    "cherrypy.HTTPError 400 missing readers.")
            raise cherrypy.HTTPError("400 missing readers")
        add_acl = True
        for admin in cherrypy.request.json["acl"]["administrators"]:
            cherrypy.log.error("admin %s" % str(admin))
            if(cherrypy.request.app.config["slycat-web-server"]["directory"](admin['user']) is None):
                add_acl = False
        for reader in cherrypy.request.json["acl"]["readers"]:
            if(cherrypy.request.app.config["slycat-web-server"]["directory"](reader['user']) is None):
                add_acl = False
        for writer in cherrypy.request.json["acl"]["writers"]:
            if(cherrypy.request.app.config["slycat-web-server"]["directory"](writer['user']) is None):
                add_acl = False
        if not add_acl:
            cherrypy.log.error("slycat.web.server.handlers.py put_project",
                                    "cherrypy.HTTPError 403 un-verifiable user")
            raise cherrypy.HTTPError("403 un-verifiable user")
        project["acl"] = cherrypy.request.json["acl"]
    if "name" in cherrypy.request.json:
        project["name"] = cherrypy.request.json["name"]

    if "description" in cherrypy.request.json:
        project["description"] = cherrypy.request.json["description"]
    database.save(project)
    cherrypy.response.status = "200 Project updated."


def delete_project(pid):
    """
    Deletes a project and all its models.
    
    Arguments:
        pid {string} -- project id
    """

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
    for project_data in couchdb.scan("slycat/project_datas", startkey=pid, endkey=pid):
        couchdb.delete(project_data)

    couchdb.delete(project)
    slycat.web.server.cleanup.arrays()

    cherrypy.response.status = "204 Project deleted."


@cherrypy.tools.json_out(on=True)
def get_project_models(pid, **kwargs):
    """
    Returns a list of project models.
    
    Arguments:
        pid {string} -- project id
    
    Returns:
        json -- list of models in project
    """
    database = slycat.web.server.database.couchdb.connect()
    project = database.get("project", pid)
    slycat.web.server.authentication.require_project_reader(project)

    models = [model for model in database.scan("slycat/project-models", startkey=pid, endkey=pid)]
    models = sorted(models, key=lambda x: x["created"], reverse=True)
    return models

@cherrypy.tools.json_out(on=True)
def put_project_csv_data(pid, file_key, parser, mid, aids):
    """
    returns a project based on "content-type" header
    :param pid: project ID
    :param file_key: file_name
    :param parser: parser name
    :param mid: model ID
    :param aids: artifact IDs
    :return: status 404 if no file found or with json {"Status": "Success"}
    """
    database = slycat.web.server.database.couchdb.connect()
    project = database.get("project", pid)
    slycat.web.server.authentication.require_project_writer(project)
    project_datas = [data for data in database.scan("slycat/project_datas")]
    attachment = []
    fid = None

    # check for existing project_datas data types
    if not project_datas:
        cherrypy.log.error("[MICROSERVICE] The project_datas list is empty.")
        raise cherrypy.HTTPError("404 There is no project data stored for this project. %s" % file_key)
    else:
        for item in project_datas:
            if item["project"] == pid and item["file_name"] == file_key:
                # find the stored data
                fid = item["_id"]
                hdf5_name = item["hdf5_name"]
                hdf5_path = cherrypy.request.app.config["slycat-web-server"]["data-store"] + "/" + hdf5_name

                # Read HDF5 file for CSV data
                decoded_data = []
                decoded_col = []
                # determine the type of data we just got and if we need to extract it eg for csv files
                # HDF5 file path
                if ('.h5' in item["file_name"]) or ('.hdf5' in item["file_name"]):
                    with open(hdf5_path, "rb") as fh:
                        file_obj = fh.read()
                        attachment.append(file_obj)
                # CSV file path
                else:
                    with h5py.File(hdf5_path, "r") as hdf5_file:

                            cherrypy.log.error("project data %s:%s" % (item,str([ [key, val] for key, val in hdf5_file.items()])))
                            data = list(hdf5_file['data_table'])
                            for col in data:
                                for item in col:
                                    decoded_item = item.decode('utf-8')
                                    decoded_col.append(decoded_item)
                                decoded_data.append(decoded_col)
                                decoded_col = []
                            decoded_rows = numpy.array(decoded_data).T

                            giant_csv_list = []
                            temp_row = []
                            for row in decoded_rows:
                                for i, entry in enumerate(row):
                                    if i == (len(row) - 1):
                                        temp_row.append(str(entry) + '\n')
                                    else:
                                        temp_row.append(str(entry) + ',')
                                temp_row_string = ''.join(temp_row)
                                giant_csv_list.append(temp_row_string)
                                temp_row = []
                            giant_csv_string = ''.join(giant_csv_list)
                            attachment.append(giant_csv_string)
                
    # if we didnt fined the file repspond with not found
    if fid is None:
        raise cherrypy.HTTPError("404 There was no file with name %s found." % file_key)
    try:
        project_data = database.get("project_data", fid)
        project_data["mid"].append(mid)
        database.save(project_data)
    except Exception as e:
        cherrypy.log.error(str(e))

    model = database.get("model", mid)
    slycat.web.server.parse_existing_file(database, parser, True, attachment, model, aids)
    return {"Status": "Success"}

@cherrypy.tools.json_out(on=True)
def get_project_file_names(pid):
    """
    Gets all the stored filenames on the server that can be used to make models for a 
    given project
    :param pid: project ID
    :return: array of found project data file names
    """
    database = slycat.web.server.database.couchdb.connect()
    project = database.get("project", pid)
    slycat.web.server.authentication.require_project_writer(project)
    project_datas = [data for data in database.scan("slycat/project_datas")]
    data = []

    if not project_datas:
        cherrypy.log.error("The project_datas list is empty.")
    else:
        for project_data in project_datas:
            if project_data["project"] == pid:
                data.append({"file_name": project_data["file_name"]})
    return data

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
    allowed_model_types = list(slycat.web.server.plugin.manager.models.keys())
    if model_type not in allowed_model_types:
        cherrypy.log.error("slycat.web.server.handlers.py post_project_models",
                                "cherrypy.HTTPError allowed model types: %s" % ", ".join(allowed_model_types))
        raise cherrypy.HTTPError("400 Allowed model types: %s" % ", ".join(allowed_model_types))

    marking = require_json_parameter("marking")
    if marking not in cherrypy.request.app.config["slycat-web-server"]["allowed-markings"]:
        cherrypy.log.error("slycat.web.server.handlers.py post_project_models",
                                "cherrypy.HTTPError 400 allowed marking types: %s" % ", ".join(
                                    cherrypy.request.app.config["slycat-web-server"]["allowed-markings"]))
        raise cherrypy.HTTPError("400 Allowed marking types: %s" % ", ".join(
            cherrypy.request.app.config["slycat-web-server"]["allowed-markings"]))

    name = require_json_parameter("name")
    description = cherrypy.request.json.get("description", "")
    mid = uuid.uuid4().hex

    model = {
        "_id": mid,
        "bookmark": "none",
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

# @cherrypy.tools.json_in(on=True)
# @cherrypy.tools.json_out(on=True)
def create_project_data_from_pid(pid, file=None, file_name=None):
    """
    creates a project level data object from a project id 
    that can be used to create new
    models in the current project
    :param file_name: artifact ID
    :param file: file attachment
    :return: not used
    """

    def isNumeric(some_thing):
        """
        Check if input is numeric

        :param some_thing: object
        :return: boolean
        """
        try:
            x = float(some_thing)
        except ValueError:
            return False
        return True

    database = slycat.web.server.database.couchdb.connect()
    project = database.get("project", pid)
    slycat.web.server.authentication.require_project_writer(project)

    str_data = str(file.file.read(), 'utf-8')
    rows = [row for row in
            csv.reader(str_data.splitlines(), delimiter=",", doublequote=True, escapechar=None, quotechar='"',
                       quoting=csv.QUOTE_MINIMAL, skipinitialspace=True)]

    columns = numpy.array(rows).T

    for i, column in enumerate(columns):
        for j, entry in enumerate(column):
            columns[i,j] = entry.encode("utf-8")

    column_names = [name.strip() for name in rows[0]]
    column_names = ["%eval_id"] + column_names
    column_types = ["string" for name in column_names]

    column_types[0] = "int64"

    for index in range(1, len(columns)):  # repack data cols as numpy arrays
        try:
            if isNumeric(columns[index][0]):
                columns[index] = numpy.array(columns[index], dtype="float64")
                column_types[index] = "float64"
            else:
                stringType = "S" + str(len(columns[index][0]))  # using length of first string for whole column
                columns[index] = numpy.array(columns[index], dtype=stringType)
                column_types[index] = "string"
        except:
            pass

    hdf5_path = cherrypy.request.app.config["slycat-web-server"]["data-store"] + "/"
    unique_name = uuid.uuid4().hex
    hdf5_name = f"{unique_name}.hdf5"
    hdf5_file_path = os.path.join(hdf5_path, hdf5_name)

    h5f = h5py.File((hdf5_file_path), "w")
    h5f.create_dataset('data_table', data=numpy.array(columns, dtype='S'))
    h5f.close()

    # Make the entry in couch for project data
    database = slycat.web.server.database.couchdb.connect()

    timestamp = time.time()
    formatted_timestamp = datetime.datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S')
    did = uuid.uuid4().hex

    data = {
        "_id": did,
        "type": "project_data",
        "hdf5_name": hdf5_name,
        "file_name": formatted_timestamp + "_" + str(file_name),
        "data_table": 'data-table',
        "project": pid,
        "mid": [''],
        "created": datetime.datetime.utcnow().isoformat(),
        "creator": cherrypy.request.login,
    }

    database.save(data)

def create_project_data(mid, aid, file):
    """
    creates a project level data object that can be used to create new
    models in the current project
    :param mid: model ID
    :param aid: artifact ID
    :param file: file attachment
    :return: not used
    """

    def isNumeric(some_thing):
        """
        Check if input is numeric

        :param some_thing: object
        :return: boolean
        """
        try:
            x = float(some_thing)
        except ValueError:
            return False
        return True
    
    # If we received an HDF5 file, we don't need to create a new one. 
    # Just need to decode the bytes and store it as is. 
    if ('.h5' in aid[1]) or ('.hdf5' in aid[1]):
        rows = []

        for f in file:
            f_buffer = io.BytesIO(f)
            f_buffer.seek(0)

            hdf5_path = cherrypy.request.app.config["slycat-web-server"]["data-store"] + "/"
            unique_name = uuid.uuid4().hex
            hdf5_name = f"{unique_name}.hdf5"
            hdf5_file_path = os.path.join(hdf5_path, hdf5_name)

            # Write the stuff
            with open(hdf5_path + hdf5_name, "wb") as f:
                f.write(f_buffer.getbuffer())

            # Make the entry in couch for project data
            content_type = "hdf5"
            database = slycat.web.server.database.couchdb.connect()
            model = database.get("model", mid)

            with slycat.web.server.get_model_lock(model["_id"]):
                model = database.get("model", mid)
                project = database.get("project", model["project"])
                pid = project["_id"]
                timestamp = time.time()
                formatted_timestamp = datetime.datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S')
                did = uuid.uuid4().hex

                #TODO review how we pass files to this
                # our file got passed as a list by someone...
                if isinstance(file, list):
                    file = file[0]
                #TODO review how we pass aids to this
                # if true we are using the new file naming structure
                if len(aid) > 1:
                    # looks like we got passed a list(list()) lets extract the name
                    if isinstance(aid[1], list):
                        aid[1] = aid[1][0]
                # for backwards compatibility for not passing the file name
                else:
                    aid.append("unnamed_file")
                data = {
                    "_id": did,
                    "type": "project_data",
                    "hdf5_name": hdf5_name,
                    "file_name": formatted_timestamp + "_" + aid[1],
                    "data_table": aid[0],
                    "project": pid,
                    "mid": [mid],
                    "created": datetime.datetime.utcnow().isoformat(),
                    "creator": cherrypy.request.login,
                }
                if "project_data" not in model:
                    model["project_data"] = []
                model["project_data"].append(did)
                database.save(model)
            database.save(data)
            cherrypy.log.error("[MICROSERVICE] Added HDF5 project data %s." % data["file_name"])

            # If we decide later to store inputs and outputs separately, this code will pull them out from the original file

            # with h5py.File(f_buffer, 'r') as h5_file:
            #     unformatted_responses = list(h5_file['models']['simulation']['model1']['responses']['functions']) # Inputs
            #     unformatted_variables = list(h5_file['models']['simulation']['model1']['variables']['continuous']) # Outputs

            #     cherrypy.log.error('Unformatted responses')
            #     cherrypy.log.error(str(unformatted_responses))

            #     h5f = h5py.File((hdf5_file_path), "w")
            #     h5f.create_dataset('data_table', data=numpy.array(columns, dtype='S'))
            #     h5f.close()

    # We didn't get an HDF5 file, so do everything normally.
    else:
        rows = []
        split_file = file[0].split('\n')

        for row in split_file:
            row_list = [row]
            split_row = row_list[0].split(',')
            rows.append(split_row)

        columns = numpy.array(rows).T

        for i, column in enumerate(columns):
            for j, entry in enumerate(column):
                columns[i,j] = entry.encode("utf-8")

        column_names = [name.strip() for name in rows[0]]
        column_names = ["%eval_id"] + column_names
        column_types = ["string" for name in column_names]

        column_types[0] = "int64"

        for index in range(1, len(columns)):  # repack data cols as numpy arrays
            try:
                if isNumeric(columns[index][0]):
                    columns[index] = numpy.array(columns[index], dtype="float64")
                    column_types[index] = "float64"
                else:
                    stringType = "S" + str(len(columns[index][0]))  # using length of first string for whole column
                    columns[index] = numpy.array(columns[index], dtype=stringType)
                    column_types[index] = "string"
            except:
                pass

        # Edit with path to store HDF5
        hdf5_path = cherrypy.request.app.config["slycat-web-server"]["data-store"] + "/"
        # Edit with name for HDF5 file
        unique_name = uuid.uuid4().hex
        hdf5_name = f"{unique_name}.hdf5"
        hdf5_file_path = os.path.join(hdf5_path, hdf5_name)

        h5f = h5py.File((hdf5_file_path), "w")
        h5f.create_dataset('data_table', data=numpy.array(columns, dtype='S'))
        h5f.close()

        # Make the entry in couch for project data
        content_type = "text/csv"
        database = slycat.web.server.database.couchdb.connect()
        model = database.get("model", mid)

        with slycat.web.server.get_model_lock(model["_id"]):
            model = database.get("model", mid)
            project = database.get("project", model["project"])
            pid = project["_id"]
            timestamp = time.time()
            formatted_timestamp = datetime.datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S')
            did = uuid.uuid4().hex

            #TODO review how we pass files to this
            # our file got passed as a list by someone...
            if isinstance(file, list):
                file = file[0]
            #TODO review how we pass aids to this
            # if true we are using the new file naming structure
            if len(aid) > 1:
                # looks like we got passed a list(list()) lets extract the name
                if isinstance(aid[1], list):
                    aid[1] = aid[1][0]
            # for backwards compatibility for not passing the file name
            else:
                aid.append("unnamed_file")
            data = {
                "_id": did,
                "type": "project_data",
                "hdf5_name": hdf5_name,
                "file_name": formatted_timestamp + "_" + aid[1],
                "data_table": aid[0],
                "project": pid,
                "mid": [mid],
                "created": datetime.datetime.utcnow().isoformat(),
                "creator": cherrypy.request.login,
            }
            if "project_data" not in model:
                model["project_data"] = []
            model["project_data"].append(did)
            database.save(model)
        database.save(data)
        cherrypy.log.error("[MICROSERVICE] Added project data %s." % data["file_name"])

@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def post_log():
    """
    send post json {"message":"message"} to log client errors onto the
    client server
    :return: 
    """
    message = require_json_parameter("message")
    cherrypy.log.error("[CLIENT/JAVASCRIPT]:: %s" % (message))
    return {"logged": True}


@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def post_project_bookmarks(pid):
    database = slycat.web.server.database.couchdb.connect()
    project = database.get("project", pid)
    slycat.web.server.authentication.require_project_reader(
        project)  # This is intentionally out-of-the-ordinary - we explicitly allow project *readers* to store bookmarks.

    content = json.dumps(cherrypy.request.json, separators=(",", ":"), indent=None, sort_keys=True)
    bid = hashlib.md5(pid.encode() + content.encode()).hexdigest()
    with slycat.web.server.database.couchdb.db_lock:
        try:
            doc = database[bid]
        except:
            doc = {
                "_id": bid,
                "project": pid,
                "type": "bookmark",
                "created": datetime.datetime.utcnow().isoformat(),
                "last_accessed": datetime.datetime.utcnow().isoformat()
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

@cherrypy.tools.json_out(on=True)
def get_model(mid, **kwargs):
    """
    Returns a model.
    
    Arguments:
        mid {string} -- model id
    
    Returns:
        json -- represents a model
    """
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    project = database.get("project", model["project"])
    slycat.web.server.authentication.require_project_reader(project)
    return model

@cherrypy.tools.json_out(on=True)
def get_project_data(did, **kwargs):
    """
    Returns a project data.
    
    Arguments:
        did {string} -- data id
    
    Returns:
        json -- represents a project data
    """
    database = slycat.web.server.database.couchdb.connect()
    project_data = database.get("project_data", did)
    project = database.get("project", project_data["project"])
    slycat.web.server.authentication.require_project_reader(project)
    return project_data

@cherrypy.tools.json_out(on=True)
def get_project_data_parameter(did, param, **kwargs):
    """
    Returns a project data parameter.

    Arguments:
        did {string} -- data id
        param {string} -- name of parameter to return
    
    Returns:
        json -- represents a project data parameter
    """
    database = slycat.web.server.database.couchdb.connect()
    project_data = database.get("project_data", did)
    project = database.get("project", project_data["project"])
    slycat.web.server.authentication.require_project_reader(project)
    
    try:
        return slycat.web.server.get_project_data_parameter(database, project_data, param)
    except KeyError as e:
        cherrypy.log.error("slycat.web.server.handlers.py get_project_data_parameter",
                                    "cherrypy.HTTPError 404 unknown parameter: %s" % param)
        raise cherrypy.HTTPError("404 Unknown parameter: %s" % param)

@cherrypy.tools.json_out(on=True)
def get_project_data_in_model(mid, **kwargs):
    """
    Returns a list of the project data in a model.

    Arguments:
        mid {string} -- model id

    Returns:
        json -- represents the project data in the model
    """
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    project = database.get("project", model["project"])
    slycat.web.server.authentication.require_project_reader(project)
    if "project_data" in model:
        return model["project_data"]
    else:
        return []

def delete_project_data(did, **kwargs):
    """
    Delete a project data record from couchdb.

    Arguments:
        did {string} -- project data id

    Returns:
        Nothing
    """
    database = slycat.web.server.database.couchdb.connect()
    project_data = database.get("project_data", did)
    project = database.get("project", project_data["project"])
    slycat.web.server.authentication.require_project_writer(project)

    for model in database.scan("slycat/models"):
        updated = False
        if "project_data" in model:
            for index, model_did in enumerate(model["project_data"]):
                if model_did == did:
                    updated = True
                    del model["project_data"][index]
        if updated:
            database.save(model)

    with slycat.web.server.get_project_data_lock(did):
        database.delete(project_data)

    cherrypy.response.status = "204 Project Data deleted."


def model_command(mid, type, command, **kwargs):
    """
    Execute a custom model command.

    Plugins may register custom commands to be executed
    on the server, using an existing model as context.
    Custom commands are used to perform computation on
    the server instead of the client, and would typically
    use model artifacts as inputs.

    Arguments:
        mid {string} -- model id
        type {string} -- Unique command category.
        command {string} -- Custom command name.
    
    Raises:
        cherrypy.HTTPError: 400 Unknown command:
    
    Returns:
        any -- whatever the registered command
    """
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    project = database.get("project", model["project"])
    slycat.web.server.authentication.require_project_reader(project)

    key = (cherrypy.request.method, type, command)
    if key in slycat.web.server.plugin.manager.model_commands:
        return slycat.web.server.plugin.manager.model_commands[key](database, model, cherrypy.request.method, type,
                                                                    command, **kwargs)

    cherrypy.log.error("slycat.web.server.handlers.py model_command",
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

    cherrypy.log.error("slycat.web.server.handlers.py model_sensitive_command",
                            "cherrypy.HTTPError 400 unknown command: %s" % command)
    raise cherrypy.HTTPError("400 Unknown command: %s" % command)


@cherrypy.tools.json_in(on=True)
def put_model(mid):
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)

    with slycat.web.server.get_model_lock(model["_id"]):
        project = database.get("project", model["project"])
        slycat.web.server.authentication.require_project_writer(project)

        save_model = False
        model = database.get('model', model["_id"])
        for key, value in cherrypy.request.json.items():
            if key not in ["name", "description", "state", "result", "progress", "message", "started", "finished",
                        "marking", "bookmark"]:
                cherrypy.log.error("slycat.web.server.handlers.py put_model",
                                        "cherrypy.HTTPError 400 unknown model parameter: %s" % key)
                raise cherrypy.HTTPError("400 Unknown model parameter: %s" % key)

            if key in ["started", "finished"]:
                try:
                    datetime.datetime.strptime(value, "%Y-%m-%dT%H:%M:%S.%f")
                except:
                    cherrypy.log.error("slycat.web.server.handlers.py put_model",
                                            "cherrypy.HTTPError 400 timestamp fields must use ISO-8601.")
                    raise cherrypy.HTTPError("400 Timestamp fields must use ISO-8601.")

            if value != model.get(key):
                model[key] = value
                save_model = True

                # Revisit this, how booksmark IDs get added to model

                #if key == "bookmark":
                #    model[key].append(value)
                #    save_model = True
                #else:
                #    model[key] = value
                #    save_model = True

                # model[key] = value
                # save_model = True

        if save_model:
            database.save(model)


def post_model_finish(mid):
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    project = database.get("project", model["project"])
    slycat.web.server.authentication.require_project_writer(project)

    # check state of the model
    if model["state"] != "waiting":
        cherrypy.log.error("slycat.web.server.handlers.py post_model_finish",
                                "cherrypy.HTTPError 400 only waiting models can be finished.")
        raise cherrypy.HTTPError("400 Only waiting models can be finished.")
    # check if the model type exists
    if model["model-type"] not in list(slycat.web.server.plugin.manager.models.keys()):
        cherrypy.log.error("slycat.web.server.handlers.py post_model_finish",
                                "cherrypy.HTTPError 500 cannot finish unknown model type.")
        raise cherrypy.HTTPError("500 Cannot finish unknown model type.")
    #
    slycat.web.server.update_model(database, model, state="running", started=datetime.datetime.utcnow().isoformat(),
                                   progress=0.0)
    slycat.web.server.plugin.manager.models[model["model-type"]]["finish"](database, model)
    cherrypy.response.status = "202 Finishing model."


def post_model_files(mid, input=None, files=None, sids=None, paths=None, aids=None, parser=None, **kwargs):
    if input is None:
        cherrypy.log.error("slycat.web.server.handlers.py post_model_files",
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
            cherrypy.log.error("slycat.web.server.handlers.py post_model_files",
                                    "cherrypy.HTTPError 400 sids and paths parameter must have the same length.")
            raise cherrypy.HTTPError("400 sids and paths parameters must have the same length.")
        files = []
        for sid, path in zip(sids, paths):
            with slycat.web.server.remote.get_session(sid) as session:
                filename = "%s@%s:%s" % (session.username, session.hostname, path)
                if stat.S_ISDIR(session.sftp.stat(path).st_mode):
                    cherrypy.log.error("slycat.web.server.handlers.py post_model_files",
                                            "cherrypy.HTTPError 400 cannot load directory %s." % filename)
                    raise cherrypy.HTTPError("400 Cannot load directory %s." % filename)
                files.append(session.sftp.file(path).read())
    else:
        cherrypy.log.error("slycat.web.server.handlers.py post_model_files",
                                "cherrypy.HTTPError 400 must supply files parameter, or sids and path parameters.")
        raise cherrypy.HTTPError("400 Must supply files parameter, or sids and paths parameters.")

    if aids is None:
        aids = []
    if not isinstance(aids, list):
        aids = [aids]

    if parser is None:
        cherrypy.log.error("slycat.web.server.handlers.py post_model_files",
                                "cherrypy.HTTPError 400 required parser parameter is missing.")
        raise cherrypy.HTTPError("400 Required parser parameter is missing.")
    if parser not in slycat.web.server.plugin.manager.parsers:
        cherrypy.log.error("slycat.web.server.handlers.py post_model_files",
                                "cherrypy.HTTPError 400 unknown parser plugin: %s" % parser)
        raise cherrypy.HTTPError("400 Unknown parser plugin: %s." % parser)

    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    project = database.get("project", model["project"])
    slycat.web.server.authentication.require_project_writer(project)

    try:
        slycat.web.server.plugin.manager.parsers[parser]["parse"](database, model, input, files, aids, **kwargs)
        # create_project_data(mid, aids, files)
    except Exception as e:
        cherrypy.log.error("handles Exception parsing posted files: %s" % e)
        cherrypy.log.error("slycat.web.server.handlers.py post_model_files",
                                "cherrypy.HTTPError 400 %s" % str(e))
        raise cherrypy.HTTPError("400 %s" % str(e))


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
        cherrypy.log.error("slycat.web.server.handlers.py post_uploads",
                                "cherrypy.HTTPError 400 unknown parser plugin: %s." % parser)
        raise cherrypy.HTTPError("400 Unknown parser plugin: %s." % parser)

    kwargs = {key: value for key, value in list(cherrypy.request.json.items()) if
              key not in ["mid", "input", "parser", "aids"]}

    uid = slycat.web.server.upload.create_session(mid, input, parser, aids, kwargs)

    cherrypy.response.headers["location"] = "%s/uploads/%s" % (cherrypy.request.base, uid)
    cherrypy.response.status = "201 Upload started."
    return {"id": uid}


def put_upload_file_part(uid, fid, pid, file=None, hostname=None, path=None):
    fid = require_integer_parameter(fid, "fid")
    pid = require_integer_parameter(pid, "pid")

    # local upload
    if file is not None and hostname is None and path is None:

        # check for byte stream
        if type(file) == str:
            data = base64.b64decode(file)
        
        # otherwise it's a file stream
        else:
            data = file.file.read()
        with slycat.web.server.upload.get_session(uid) as session:
            session.put_upload_file_part(fid, pid, data)
    # remote file
    elif file is None and hostname is not None and path is not None:
        sid, session_type = get_sid(hostname)
        if session_type == "ssh":
            with slycat.web.server.upload.get_session(uid) as session:
                session.put_remote_upload_file_part(sid, fid, pid, path)
        elif session_type == "smb":
            with slycat.web.server.smb.get_session(sid) as session:
                data = session.get_file(path=path)
                with slycat.web.server.upload.get_session(uid) as session:
                    session.put_upload_file_part(fid, pid, data)
    else:
        cherrypy.log.error("slycat.web.server.handlers.py put_upload_file_part",
                                "cherrypy.HTTPError 400 must supply file parameter, or sid and path parameters.")
        raise cherrypy.HTTPError("400 Must supply file parameter, or sid and path parameters.")


@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def post_upload_finished(uid):
    """
    ask the server to finish the upload
    :param uid: upload session ID
    :return: status of upload
    """
    uploaded = require_integer_array_json_parameter("uploaded")

    # check that useProjectData is present before using
    # otherwise, default to False
    useProjectData = False
    if 'useProjectData' in cherrypy.request.json: 
        useProjectData = require_boolean_json_parameter("useProjectData")

    with slycat.web.server.upload.get_session(uid) as session:
        return session.post_upload_finished(uploaded, useProjectData)


def delete_upload(uid):
    """
    Delete an upload session used to upload files for storage as model artifacts. 
    This function must be called once the client no longer needs the session, 
    whether the upload(s) have been completed successfully or the 
    client is cancelling an incomplete session.

    status 204
      The upload session and any temporary storage have been deleted.

    status 409
      The upload session cannot be deleted, because parsing is in progress. 
      Try again later.

    :param uid: upload sessin id
    :return: not used
    """
    slycat.web.server.upload.delete_session(uid)
    cherrypy.response.status = "204 Upload session deleted."


def open_id_authenticate(**params):
    """
    takes the openid parameter sent
    to this function and logs in a user
    :param params: openid params as a dictionary
    :return: not used
    """
    cherrypy.log.error("++ open_id_authenticate starting, incoming params = %s" % params)
    # check for openid in the config for security
    if slycat.web.server.config["slycat-web-server"]["authentication"]["plugin"] != "slycat-openid-authentication":
        raise cherrypy.HTTPError(404)

    cherrypy.log.error("++ open_id_authenticate incoming params = %s" % params)
    current_url = urlparse(cherrypy.url() + "?" + cherrypy.request.query_string)
    
    kerberos_principal = params['openid.ext2.value.Authuser']
    auth_user = kerberos_principal.split("@")[0]
    cherrypy.log.error("++ open_id_authenticate: setting auth_user = %s, calling create_single_sign_on_session" % auth_user)
    slycat.web.server.create_single_sign_on_session(slycat.web.server.check_https_get_remote_ip(), auth_user)
    raise cherrypy.HTTPRedirect("https://" + current_url.netloc + "/projects")


@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def login():
    """
    Takes the post object under cherrypy.request.json with the users name and password
    and determins with the user can be authenticated with slycat
    :return: authentication status
    """

    # try and decode the username and password
    user_name, password = slycat.web.server.decode_username_and_password()

    # cherrypy.log.error("login attempt started %s" % datetime.datetime.utcnow())
    # try and delete any outdated sessions for the user if they have the cookie for it
    slycat.web.server.clean_up_old_session(user_name)

    realm = None

    # get the route they came from and check if the server root is the same,
    # if so redirect to the place they came from
    response_url = slycat.web.server.response_url()

    # Get the client ip, which might be forwarded by a proxy.
    remote_ip = cherrypy.request.headers.get(
        "x-forwarded-for") if "x-forwarded-for" in cherrypy.request.headers else cherrypy.request.rem

    # see if we have a registered password checking function from our config
    password_check = slycat.web.server.get_password_function()
    # time to test username and password
    success, groups = password_check(realm, user_name, password)

    if success:
        # check the rules
        slycat.web.server.check_rules(groups)
        # we got passed the rules check
        # Successful authentication and access verification, create a session and return.
        slycat.web.server.create_single_sign_on_session(remote_ip, user_name)
    else:
        # cherrypy.log.error("user %s at %s failed authentication" % (user_name, remote_ip))
        cherrypy.response.status = "404 no auth found!!!"

    return {'success': success, 'target': response_url}

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

@cherrypy.tools.json_out(on=True)
def clean_project_data():
  """
  cleans out project data that is not being pointed at
  by a parameter space model, and cleans up models that 
  are not parameter space but point to project data
  """
  slycat.web.server.authentication.require_server_administrator()
  couchdb = slycat.web.server.database.couchdb.connect()
  # get a view list of all pd ids
  for row in couchdb.view("slycat/project_datas"):
      pd_doc = couchdb.get(type="project_data",id=row.id)
      delete_pd = True
      # go through model list in pd and start cleaning
      for model_id in pd_doc['mid']:
          model_doc = couchdb.get(type="model",id=model_id)
          if model_doc["model-type"] == "parameter-image":
              delete_pd = False
          # clean up models that don't need pd
          elif "project_data" in model_doc:
              cherrypy.log.error("Removing PD from none parameter-space model")
              del model_doc["project_data"]
              couchdb.save(model_doc)
      if delete_pd:
          # delete the bad project data
          couchdb.delete(pd_doc)
          cherrypy.log.error("Deleting PD::: %s" % str(row.id))
  return {"status":"ok"}

@cherrypy.tools.json_out(on=True)
def clear_ssh_sessions():
  """
  clears out of the ssh session for the current user
  """
  try:
      if "slycatauth" in cherrypy.request.cookie:
          sid = cherrypy.request.cookie["slycatauth"].value
          couchdb = slycat.web.server.database.couchdb.connect()
          session = couchdb.get("session", sid)
          cherrypy.log.error("ssh and smb sessions cleared for user session: %s" % session)
          cherrypy.response.status = "200"
          if session is not None:
              for ssh_session in session["sessions"]:
                  cherrypy.log.error("sessions %s" % ssh_session["sid"])
                  slycat.web.server.remote.delete_session(ssh_session["sid"])
              session['sessions'] = []
              couchdb.save(session)
      else:
          cherrypy.response.status = "403 Forbidden"
  except Exception:
      raise cherrypy.HTTPError("400 Bad Request")
  return {"status":"ok"}

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
        cherrypy.log.error("slycat.web.server.handlers.py put_model_inputs",
                                "cherrypy.HTTPError 400 cannot duplicate a model from another project.")
        raise cherrypy.HTTPError("400 Cannot duplicate a model from another project.")

    slycat.web.server.put_model_inputs(database, model, source, deep_copy)

@cherrypy.tools.json_in(on=True)
def put_project_data_parameter(did, aid):
    database = slycat.web.server.database.couchdb.connect()
    # project_data = database.get("project-data", did)
    # Alex changing dash to underscore, otherwise this breaks
    project_data = database.get("project_data", did)
    project = database.get("project", project_data["project"])
    slycat.web.server.authentication.require_project_writer(project)

    value = require_json_parameter("value")
    require_input = require_boolean_json_parameter("input")
    with slycat.web.server.database.couchdb.db_lock:
        try:
            slycat.web.server.put_project_data_parameter(database, project_data, aid, value, require_input)
        except Exception:
            time.sleep(1)
            database = slycat.web.server.database.couchdb.connect()
            project_data = database.get("project_data", did)
            project = database.get("project", project_data["project"])
            slycat.web.server.authentication.require_project_writer(project)

            value = require_json_parameter("value")
            require_input = require_boolean_json_parameter("input")
            slycat.web.server.put_project_data_parameter(database, project_data, aid, value, require_input)


@cherrypy.tools.json_in(on=True)
def put_model_parameter(mid, aid):
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    project = database.get("project", model["project"])
    slycat.web.server.authentication.require_project_writer(project)

    value = require_json_parameter("value")
    require_input = require_boolean_json_parameter("input")
    with slycat.web.server.database.couchdb.db_lock:
        try:
            slycat.web.server.put_model_parameter(database, model, aid, value, require_input)
        except Exception:
            time.sleep(1)
            database = slycat.web.server.database.couchdb.connect()
            model = database.get("model", mid)
            project = database.get("project", model["project"])
            slycat.web.server.authentication.require_project_writer(project)

            value = require_json_parameter("value")
            require_input = require_boolean_json_parameter("input")
            slycat.web.server.put_model_parameter(database, model, aid, value, require_input)

def delete_model_parameter(mid, aid):
    """
    delete a model artifact 
    :param mid: model Id
    :param aid: artifact id
    :return: 
    """
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    project = database.get("project", model["project"])
    slycat.web.server.authentication.require_project_writer(project)

    slycat.web.server.delete_model_parameter(database, model, aid)
    slycat.web.server.cleanup.arrays()

    cherrypy.response.status = "204 Model deleted."


@cherrypy.tools.json_in(on=True)
def put_model_arrayset(mid, aid):
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    project = database.get("project", model["project"])
    slycat.web.server.authentication.require_project_writer(project)

    require_input = require_boolean_json_parameter("input")

    slycat.web.server.put_model_arrayset(database, model, aid, require_input)


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
        cherrypy.log.error("slycat.web.server.handlers.py put_model_arrayset_data",
                                "cherrypy.HTTPError 400 not a valid hyperchunks specification.")
        raise cherrypy.HTTPError("400 Not a valid hyperchunks specification.")

    if byteorder is not None and byteorder not in ["big", "little"]:
        cherrypy.log.error("slycat.web.server.handlers.py put_model_arrayset_data",
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
                        #cherrypy.log.error(
                        #    "Writing %s/%s/%s/%s" % (aid, array.index, attribute.expression.index, hyperslice))

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
                                    cherrypy.log.error("slycat.web.server.handlers.py put_model_arrayset_data",
                                                            "Unexpected hyperslice: %s" % hyperslice_dimension)
                                    raise ValueError("Unexpected hyperslice: %s" % hyperslice_dimension)

                        # Convert data to an array ...
                        data_type = slycat.hdf5.dtype(hdf5_array.attributes[attribute.expression.index]["type"])
                        data_size = numpy.prod(data_shape)

                        if byteorder is None:
                            hyperslice_data = numpy.array(next(data_iterator), dtype=data_type).reshape(data_shape)
                        elif byteorder == sys.byteorder:
                            hyperslice_data = numpy.fromfile(data.file, dtype=data_type, count=data_size).reshape(
                                data_shape)
                        else:
                            cherrypy.log.error("slycat.web.server.handlers.py put_model_arrayset_data",
                                                    "Not implemented error.")
                            raise NotImplementedError()

                        hdf5_array.set_data(attribute.expression.index, hyperslice, hyperslice_data)


def delete_project_data_in_model(did, mid):
    """
    Removes a project data id from a model.

    :param did: Project data id
    :param mid: Model id
    """
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    project = database.get("project", model["project"])
    slycat.web.server.authentication.require_project_writer(project)

    updated = False
    with slycat.web.server.get_model_lock(model["_id"]):
        for index, model_did in enumerate(model["project_data"]):
            if model_did == did:
                updated = True
                del model["project_data"][index]
        if updated:
            database.save(model)

    cherrypy.response.status = "204 Project data removed from model."

def delete_model_in_project_data(mid, did):
    """
    Removes a model id from project data.

    :param mid: Model id
    :param did: Project data id
    """
    database = slycat.web.server.database.couchdb.connect()
    project_data = database.get("project_data", did)
    project = database.get("project", project_data["project"])
    slycat.web.server.authentication.require_project_writer(project)

    updated = False
    with slycat.web.server.get_project_data_lock(project_data["_id"]):
        for index, pd_mid in enumerate(project_data["mid"]):
            if pd_mid == mid:
                updated = True
                del project_data["mid"][index]
            if updated:
                database.save(project_data)

    cherrypy.response.status = "204 Model removed from project data."

def delete_model(mid):
    couchdb = slycat.web.server.database.couchdb.connect()
    try:
        model = couchdb.get("model", mid)
        project = couchdb.get("project", model["project"])
        slycat.web.server.authentication.require_project_writer(project)

        for project_data in couchdb.scan("slycat/project_datas", startkey=model["project"], endkey=model["project"]):
            updated = False
            with slycat.web.server.get_project_data_lock(project_data["_id"]):
                for index, pd_mid in enumerate(project_data["mid"]):
                    if pd_mid == mid:
                        updated = True
                        del project_data["mid"][index]
                if updated:
                    couchdb.save(project_data)

        couchdb.delete(model)
    except Exception as e:
        cherrypy.log.error('exception raised in delete model: %s' % str(e))
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
    """
    Retrieves an object from a project’s cache. 
    Cache objects are opaque binary blobs that 
    may contain arbitrary data, plus an explicit 
    content type.
    
    Arguments:
        pid {string} -- project id
        key {string} -- string key for obj
    
    Raises:
        cherrypy.HTTPError: 404 not found
    
    Returns:
        attachment from database
    """
    database = slycat.web.server.database.couchdb.connect()
    project = database.get("project", pid)
    slycat.web.server.authentication.require_project_reader(project)

    lookup = pid + "-" + key
    for cache_object in database.scan("slycat/project-key-cache-objects", startkey=lookup, endkey=lookup):
        cherrypy.response.headers["content-type"] = cache_object["_attachments"]["content"]["content_type"]
        return database.get_attachment(cache_object, "content")

    raise cherrypy.HTTPError(404)


def delete_project_cache_object(pid, key):
    """
    Deletes an object from the project cache.
    
    Arguments:
        pid {string} -- project id
        key {string} -- key in the cache
    
    Raises:
        cherrypy.HTTPError: 404 not found
    """
    couchdb = slycat.web.server.database.couchdb.connect()
    project = couchdb.get("project", pid)
    slycat.web.server.authentication.require_project_writer(project)

    lookup = pid + "-" + key
    for cache_object in couchdb.scan("slycat/project-key-cache-objects", startkey=lookup, endkey=lookup):
        couchdb.delete(cache_object)
        cherrypy.response.status = "204 Cache object deleted."
        return

    cherrypy.log.error("slycat.web.server.handlers.py delete_project_cache_object", "cherrypy.HTTPError 404")
    raise cherrypy.HTTPError(404)


def delete_project_cache(pid):
    """
    clears all the cached images and videos for a project
    given a project ID
    :param pid: Project ID
    :return: status
    """
    couchdb = slycat.web.server.database.couchdb.connect()
    project = couchdb.get("project", pid)
    slycat.web.server.authentication.require_project_administrator(project)

    for cache_object in couchdb.scan("slycat/project-cache-objects", startkey=pid, endkey=pid):
        couchdb.delete(cache_object)

    cherrypy.response.status = "204 Cache objects deleted."


def get_model_array_attribute_chunk(mid, aid, array, attribute, **arguments):
    try:
        attribute = int(attribute)
    except:
        raise cherrypy.HTTPError("400 Malformed attribute argument must be a zero-based integer attribute index.")

    try:
        ranges = [int(spec) for spec in arguments["ranges"].split(",")]
        i = iter(ranges)
        ranges = list(zip(i, i))
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
                return json.dumps(data.tolist(), cls=MyEncoder).encode()
            else:
                if sys.byteorder != byteorder:
                    return data.byteswap().tostring(order="C")
                else:
                    return data.tostring(order="C")


@cherrypy.tools.json_out(on=True)
def get_model_arrayset_metadata(mid, aid, **kwargs):
    """
    Used to retrieve metadata and statistics for an arrayset artifact
    - a collection of dense, multidimensional darray objects. A darray
    is a dense, multi-dimensional, multi-attribute array,
    suitable for storage of arbitrarily-large data.

    The metadata for a single darray includes the name, type,
    half-open range of coordinate values, and shape for each
    dimension in the array, plus the name and type of each attribute.

    Statistics can be retrieved for individual darray attributes, and
    include minimum and maximum values, plus a count of unique
    values for an attribute. Although statistics are cached, retrieving
    them may be an extremely expensive operation, since they involve
    full scans through their respective attributes. Because of this,
    callers are encouraged to retrieve statistics only when needed.
    
    Arguments:
        mid {string} -- model id
        aid {string} -- artifact id
    
    Raises:
        cherrypy.HTTPError: 404
        cherrypy.HTTPError: 400 aid is not an array artifact.
        cherrypy.HTTPError: 400 Not a valid hyperchunks specification.
    
    Returns:
        json -- statistical results of arrayset
    """
    cherrypy.log.error("GET arrayset metadata mid:%s aid:%s kwargs:%s" % (mid, aid, list(kwargs.keys())))
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    project = database.get("project", model["project"])
    slycat.web.server.authentication.require_project_reader(project)

    artifact = model.get("artifact:%s" % aid, None)
    if artifact is None:
        cherrypy.log.error("slycat.web.server.handlers.py get_model_arrayset_metadata",
                                "cherrypy.HTTPError 404 artifact is None for aid: %s" % aid)
        raise cherrypy.HTTPError(404)
    artifact_type = model["artifact-types"][aid]
    if artifact_type not in ["hdf5"]:
        cherrypy.log.error("slycat.web.server.handlers.py get_model_arrayset_metadata",
                                "cherrypy.HTTPError 400 %s is not an array artifact." % aid)
        raise cherrypy.HTTPError("400 %s is not an array artifact." % aid)

    try:
        arrays = slycat.hyperchunks.parse(kwargs["arrays"]) if "arrays" in kwargs else None
    except:
        cherrypy.log.error("slycat.web.server.handlers.py get_model_arrayset_metadata",
                                "cherrypy.HTTPError 400 not a valid hyperchunks specification.")
        raise cherrypy.HTTPError("400 Not a valid hyperchunks specification.")

    try:
        statistics = slycat.hyperchunks.parse(kwargs["statistics"]) if "statistics" in kwargs else None
    except:
        cherrypy.log.error("slycat.web.server.handlers.py get_model_arrayset_metadata",
                                "cherrypy.HTTPError 400 not a valid hyperchunks specification.")
        raise cherrypy.HTTPError("400 Not a valid hyperchunks specification.")

    try:
        unique = slycat.hyperchunks.parse(kwargs["unique"]) if "unique" in kwargs else None
    except:
        cherrypy.log.error("slycat.web.server.handlers.py get_model_arrayset_metadata",
                                "cherrypy.HTTPError 400 not a valid hyperchunks specification.")
        raise cherrypy.HTTPError("400 Not a valid hyperchunks specification.")
    cherrypy.log.error("GET arrayset metadata arrays:%s stats:%s unique:%s" % (arrays, statistics, unique))
    results = slycat.web.server.get_model_arrayset_metadata(database, model, aid, arrays, statistics, unique)
    #cherrypy.log.error("GOT RESULTS")
    if "unique" in results:
        for unique in results["unique"]:
            # Maybe due to caching, sometimes the result comes back as a 'list'
            if isinstance(results["unique"][0]['values'][0], list):
              unique["values"] = [list_of_values for list_of_values in unique["values"]]
            # Other times it's a 'numpy.ndarray'
            else:
              unique["values"] = [array.tolist() for array in unique["values"]]
    # have to load and dump to clean out all the non json serializable numpy arrays
    return json.loads(json.dumps(results, cls=MyEncoder))


def get_model_arrayset_data(mid, aid, hyperchunks, byteorder=None):
    """
    Retrieve data stored in arrayset darray attributes. The caller 
    may request data stored using any combination of 
    arrays, attributes, and hyperslices.
    
    Arguments:
        mid {string} -- model id
        aid {string} -- artifact id
        hyperchunks {string} -- The request must contain a parameter 
          hyperchunks that specifies the arrays, attributes, 
          and hyperslices to be returned, in Hyperchunks format.
    
    Keyword Arguments:
        byteorder {string} -- optional byteorder argument must 
          be big or little. (default: {None})
    
    Raises:
        cherrypy.HTTPError: 400 aid is not an array artifact.
        cherrypy.HTTPError: 400 Not a valid hyperchunks specification
        cherrypy.HTTPError: 400 optional byteorder argument must be big or little.
        cherrypy.HTTPError: 404 aid not found
    
    Returns:
        octet-stream -- application/octet-stream
    """
    cherrypy.log.error(
        "GET Model Arrayset Data: arrayset %s hyperchunks %s byteorder %s" % (aid, hyperchunks, byteorder))
    try:
        hyperchunks = slycat.hyperchunks.parse(hyperchunks)
    except Exception as e:
        cherrypy.log.error("slycat.web.server.handlers.py get_model_arrayset_data",
                                "cherrypy.HTTPError 400 not a valid hyperchunks specification.")
        raise cherrypy.HTTPError("400 Not a valid hyperchunks specification.%s%s" % (e, traceback.print_exc()))

    if byteorder is not None:
        if byteorder not in ["big", "little"]:
            cherrypy.log.error("slycat.web.server.handlers.py get_model_arrayset_data",
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
        cherrypy.log.error("slycat.web.server.handlers.py get_model_arrayset_data", "cherrypy.HTTPError 404")
        raise cherrypy.HTTPError(404)
    artifact_type = model["artifact-types"][aid]
    if artifact_type not in ["hdf5"]:
        cherrypy.log.error("slycat.web.server.handlers.py get_model_arrayset_data",
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
                              slycat.web.server.get_model_arrayset_data(database, model, aid, hyperchunks)]).encode()
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
    hyperchunks = cherrypy.request.json["hyperchunks"]
    try:
        byteorder = cherrypy.request.json["byteorder"]
    except Exception as e:
        byteorder = None
        #cherrypy.log.error("no byteorder provided moving on")

    # parse the hyperchunks
    cherrypy.log.error(
        "GET Model Arrayset Data: arrayset %s hyperchunks %s byteorder %s" % (aid, hyperchunks, byteorder))
    try:
        hyperchunks = slycat.hyperchunks.parse(hyperchunks)
    except:
        cherrypy.log.error("slycat.web.server.handlers.py get_model_arrayset_data",
                                "cherrypy.HTTPError 400 not a valid hyperchunks specification.")
        raise cherrypy.HTTPError("400 Not a valid hyperchunks specification.")
    cherrypy.log.error("GET Model Arrayset Data: arrayset %s hyperchunks calculated" % (aid))

    #
    if byteorder is not None:
        if byteorder not in ["big", "little"]:
            cherrypy.log.error("slycat.web.server.handlers.py get_model_arrayset_data",
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
        cherrypy.log.error("slycat.web.server.handlers.py get_model_arrayset_data", "cherrypy.HTTPError 404")
        raise cherrypy.HTTPError(404)
    artifact_type = model["artifact-types"][aid]
    if artifact_type not in ["hdf5"]:
        cherrypy.log.error("slycat.web.server.handlers.py get_model_arrayset_data",
                                "cherrypy.HTTPError 400 %s is not an array artifact." % aid)
        raise cherrypy.HTTPError("400 %s is not an array artifact." % aid)

    def mask_nans(array):
        """Convert an array containing nans into a masked array."""
        try:
            return numpy.ma.masked_where(numpy.isnan(array), array)
        except:
            return array

    def content():
        if "include_nans" in cherrypy.request.json:
            include_nans = cherrypy.request.json["include_nans"]
        if byteorder is None:
            yield json.dumps([mask_nans(hyperslice).tolist() for hyperslice in
                              slycat.web.server.get_model_arrayset_data(database, model, aid, hyperchunks)]).encode()
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
        cherrypy.log.error("slycat.web.server.handlers.py validate_table_rows",
                                "cherrypy.HTTPError 400 malformed rows argument must be a comma separated collection of row indices or half-open index ranges.")
        raise cherrypy.HTTPError(
            "400 Malformed rows argument must be a comma separated collection of row indices or half-open index ranges.")

    if numpy.any(rows < 0):
        cherrypy.log.error("slycat.web.server.handlers.py validate_table_rows",
                                "cherrypy.HTTPError 400 row values must be non-negative.")
        raise cherrypy.HTTPError("400 Row values must be non-negative.")

    return rows


def validate_table_columns(columns):
    try:
        columns = [spec.split("-") for spec in columns.split(",")]
        columns = [(int(spec[0]), int(spec[1]) if len(spec) == 2 else int(spec[0]) + 1) for spec in columns]
        columns = numpy.concatenate([numpy.arange(begin, end) for begin, end in columns])
        columns = columns[columns >= 0]
    except Exception as e:
        cherrypy.log.error(str(e))
        cherrypy.log.error("slycat.web.server.handlers.py validate_table_columns",
                                "cherrypy.HTTPError 400 malformed columns argument must be a comma separated collection of column indices or half-open index ranges.")
        raise cherrypy.HTTPError(
            "400 Malformed columns argument must be a comma separated collection of column indices or half-open index ranges.")
    if numpy.any(columns < 0):
        cherrypy.log.error("slycat.web.server.handlers.py validate_table_columns",
                                "cherrypy.HTTPError 400 column values must be non-negative.")
        raise cherrypy.HTTPError("400 Column values must be non-negative.")
    return columns


def validate_table_sort(sort):
    if sort is not None:
        try:
            sort = [spec.split(":") for spec in sort.split(",")]
            sort = [(column, order) for column, order in sort]
        except:
            cherrypy.log.error("slycat.web.server.handlers.py validate_table_sort",
                                    "cherrypy.HTTPError 400 malformed order argument must be a comma separated collection of column:order tuples.")
            raise cherrypy.HTTPError(
                "400 Malformed order argument must be a comma separated collection of column:order tuples.")

        try:
            sort = [(int(column), order) for column, order in sort]
        except:
            cherrypy.log.error("slycat.web.server.handlers.py validate_table_sort",
                                    "cherrypy.HTTPError 400 sort column must be an integer.")
            raise cherrypy.HTTPError("400 Sort column must be an integer.")

        for column, order in sort:
            if column < 0:
                cherrypy.log.error("slycat.web.server.handlers.py validate_table_sort",
                                        "cherrypy.HTTPError 400 sort column must be non-negative.")
                raise cherrypy.HTTPError("400 Sort column must be non-negative.")
            if order not in ["ascending", "descending"]:
                cherrypy.log.error("slycat.web.server.handlers.py validate_table_sort",
                                        "cherrypy.HTTPError 400 sort-order must be 'ascending' or 'descending'")
                raise cherrypy.HTTPError("400 Sort-order must be 'ascending' or 'descending'.")

        if len(sort) != 1:
            cherrypy.log.error("slycat.web.server.handlers.py validate_table_sort",
                                    "cherrypy.HTTPError 400 currently, only one column can be sorted.")
            raise cherrypy.HTTPError("400 Currently, only one column can be sorted.")

    return sort


def validate_table_byteorder(byteorder):
    if byteorder is not None:
        if byteorder not in ["little", "big"]:
            cherrypy.log.error("slycat.web.server.handlers.py validate_table_sort",
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
        cherrypy.log.error("slycat.web.server.handlers.py get_table_metadata",
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
        cherrypy.log.error("slycat.web.server.handlers.py get_model_table_metadata",
                                "cherrypy.HTTPError 404 artifact is None for aid: %s" % aid)
        raise cherrypy.HTTPError(404)
    artifact_type = model["artifact-types"][aid]
    if artifact_type not in ["hdf5"]:
        cherrypy.log.error("slycat.web.server.handlers.py get_model_table_metadata",
                                "cherrypy.HTTPError 400 %s is not an array artifact." % aid)
        raise cherrypy.HTTPError("400 %s is not an array artifact." % aid)

    with slycat.web.server.hdf5.lock:
        with slycat.web.server.hdf5.open(artifact,
                                         "r+") as file:  # We have to open the file with writing enabled because the statistics cache may need to be updated.
            metadata = get_table_metadata(file, array, index)
        # have to load and dump to clean out all the non json serializable numpy arrays
        return json.loads(json.dumps(metadata, cls=MyEncoder))


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
        cherrypy.log.error("slycat.web.server.handlers.py get_model_table_chunk",
                                "cherrypy.HTTPError 404 artifact is None for aid: %s" % aid)
        raise cherrypy.HTTPError(404)
    artifact_type = model["artifact-types"][aid]
    if artifact_type not in ["hdf5"]:
        cherrypy.log.error("slycat.web.server.handlers.py get_model_table_chunk",
                                "cherrypy.HTTPError 400 %s is not an array artifact." % aid)
        raise cherrypy.HTTPError("400 %s is not an array artifact." % aid)

    with slycat.web.server.hdf5.lock:
        with slycat.web.server.hdf5.open(artifact, mode="r+") as file:
            metadata = get_table_metadata(file, array, index)

            # Constrain end <= count along both dimensions
            rows = rows[rows < metadata["row-count"]]
            if numpy.any(columns >= metadata["column-count"]):
                cherrypy.log.error("slycat.web.server.handlers.py get_model_table_chunk",
                                        "cherrypy.HTTPError 400 column out-of-range.")
                raise cherrypy.HTTPError("400 Column out-of-range.")
            if sort is not None:
                for column, order in sort:
                    if column >= metadata["column-count"]:
                        cherrypy.log.error("slycat.web.server.handlers.py get_model_table_chunk",
                                                "400 sort column out-of-range.")
                        raise cherrypy.HTTPError("400 Sort column out-of-range.")

            # Retrieve the data
            data = []
            sort_index = get_table_sort_index(file, metadata, array, sort, index)
            sort_slice = sort_index[rows]
            slice_index = numpy.argsort(sort_slice, kind="mergesort")
            slice_reverse_index = numpy.argsort(slice_index, kind="mergesort")
            for column in columns:
                meta_type = metadata["column-types"][column]
                if index is not None and column == metadata["column-count"] - 1:
                    values = sort_slice.tolist()
                else:
                    values = slycat.hdf5.ArraySet(file)[array].get_data(column)[sort_slice[slice_index].tolist()][
                        slice_reverse_index].tolist()
                    if meta_type in ["float32", "float64"]:
                        values = [None if numpy.isnan(value) else value for value in values]
                data.append(values)

            result = {
                "rows": rows.tolist(),
                "columns": columns.tolist(),
                "column-names": [metadata["column-names"][column] for column in columns],
                "data": data,
                "sort": sort
            }

    return json.loads(json.dumps(result, cls=MyEncoder))


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
        cherrypy.log.error("slycat.web.server.handlers.py get_model_table_sorted_indices",
                                "cherrypy.HTTPError 404 artifact is None for aid: %s" % aid)
        raise cherrypy.HTTPError(404)
    artifact_type = model["artifact-types"][aid]
    if artifact_type not in ["hdf5"]:
        cherrypy.log.error("slycat.web.server.handlers.py get_model_table_sorted_indices",
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
                        cherrypy.log.error("slycat.web.server.handlers.py get_model_table_sorted_indices",
                                                "cherrypy.HTTPError 400 sort column out-of-range.")
                        raise cherrypy.HTTPError("400 Sort column out-of-range.")

            # Retrieve the data ...
            sort_index = get_table_sort_index(file, metadata, array, sort, index)
            slice_val = numpy.argsort(sort_index, kind="mergesort")[rows].astype("int32")

        if byteorder is None:
            return json.dumps(slice_val.tolist())
        else:
            if sys.byteorder != byteorder:
                return slice_val.byteswap().tostring(order="C")
            else:
                return slice_val.tostring(order="C")


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
        cherrypy.log.error("slycat.web.server.handlers.py get_model_table_unsorted_indices",
                                "cherrypy.HTTPError 404 artifact is None for aid: %s" % aid)
        raise cherrypy.HTTPError(404)
    artifact_type = model["artifact-types"][aid]
    if artifact_type not in ["hdf5"]:
        cherrypy.log.error("slycat.web.server.handlers.py get_model_table_unsorted_indices",
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
                        cherrypy.log.error("slycat.web.server.handlers.py get_model_table_unsorted_indices",
                                                "cherrypy.HTTPError 400 sort column out-of-range.")
                        raise cherrypy.HTTPError("400 Sort column out-of-range.")

            # Generate a database query
            sort_index = get_table_sort_index(file, metadata, array, sort, index)
            slice_val = sort_index[rows].astype("int32")

        if byteorder is None:
            return json.dumps(slice_val.tolist())
        else:
            if sys.byteorder != byteorder:
                return slice_val.byteswap().tostring(order="C")
            else:
                return slice_val.tostring(order="C")


def get_model_file(mid, aid):
    """  
    Retrieves a file artifact from a model. File artifacts are effectively
    binary blobs that may contain arbitrary data with an explicit content
    type.
    
    Arguments:
        mid {string} -- model id
        aid {string} -- artifact id
    
    Raises:
        cherrypy.HTTPError: 404
        cherrypy.HTTPError: 400 aid is not a file artifact.
    
    Returns:
        any -- file
    """
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    project = database.get("project", model["project"])
    slycat.web.server.authentication.require_project_reader(project)

    artifact = model.get("artifact:%s" % aid, None)
    if artifact is None:
        cherrypy.log.error("slycat.web.server.handlers.py get_model_file",
                                "cherrypy.HTTPError 404 artifact is None for aid: %s" % aid)
        raise cherrypy.HTTPError(404)
    artifact_type = model["artifact-types"][aid]
    if artifact_type != "file":
        cherrypy.log.error("slycat.web.server.handlers.py get_model_file",
                                "cherrypy.HTTPError 400 %s is not a file artifact." % aid)
        raise cherrypy.HTTPError("400 %s is not a file artifact." % aid)
    fid = artifact

    cherrypy.response.headers["content-type"] = model["_attachments"][fid]["content_type"]
    return database.get_attachment(mid, fid)


@cherrypy.tools.json_out(on=True)
def get_model_parameter(mid, aid):
    """
    Retrieves a model parameter (name / value pair) artifact. The result is a
    JSON expression and may be arbitrarily complex.
    
    Arguments:
        mid {string} -- model id
        aid {string} -- artifact id
    
    Raises:
        cherrypy.HTTPError: 404 Unknown artifact
    
    Returns:
        json
    """
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    project = database.get("project", model["project"])
    slycat.web.server.authentication.require_project_reader(project)

    try:
        return slycat.web.server.get_model_parameter(database, model, aid)
    except KeyError as e:
        cherrypy.log.error("slycat.web.server.handlers.py get_model_parameter",
                                "cherrypy.HTTPError 404 unknown artifact: %s" % aid)
        raise cherrypy.HTTPError("404 Unknown artifact: %s" % aid)


def get_bookmark(bid):
    """
    Retrieves a bookmark - an arbitrary collection of client state.
    
    Arguments:
        bid {string} -- bookmark id
    
    Returns:
        json -- representation of client state
    """
    accept = cherrypy.lib.cptools.accept(media=["application/json"])

    database = slycat.web.server.database.couchdb.connect()
    bookmark = database.get("bookmark", bid)
    project = database.get("project", bookmark["project"])
    slycat.web.server.authentication.require_project_reader(project)

    # Update last accessed
    bookmark = database.get("bookmark", bid)
    slycat.web.server.authentication.require_project_reader(project)
    bookmark["last_accessed"] = datetime.datetime.utcnow().isoformat()
    database.save(bookmark)

    cherrypy.response.headers["content-type"] = accept
    return database.get_attachment(bookmark, "bookmark")


@cherrypy.tools.json_out(on=True)
def get_user(uid, time):
    """
    Retrieve directory information for a given user.
    
    Arguments:
      uid {string} -- users id
      time {int} -- time int to prevent caching
    
    Raises:
      cherrypy.HTTPError: 404 user not found
    
    Returns:
      json -- user info
    """

    if uid == "-":
        uid = cherrypy.request.login
    user = cherrypy.request.app.config["slycat-web-server"]["directory"](uid)
    if user is None:
        cherrypy.log.error("slycat.web.server.handlers.py get_user",
                                "cherrypy.HTTPError 404 user is None for uid: %s" % uid)
        raise cherrypy.HTTPError(404)
    # Add the uid to the record, since the caller may not know it.
    user["uid"] = uid
    return user


@cherrypy.tools.json_out(on=True)
def get_model_statistics(mid):
    """
    gets statistics on the model
    
    Arguments:
      mid {string} -- model ID
      time {int} -- time int to prevent caching
    
    Raises:
      cherrypy.HTTPError: 404 user not found
    
    Returns:
      mid {string} -- mid
      hdf5_file_size {float} -- hdf5_file_size
      total_server_data_size {float} -- total_server_data_size
      hdf5_store_size {float} -- total_hdf5_server_size
      model {string} -- model
      delta_creation_time {float} -- delta_creation_time
      couchdb_doc_size {float} -- sys.getsizeof(model)
    """
    database = slycat.web.server.database.couchdb.connect()
    try:
        model = database.get("model", mid)
        project = database.get("project", model["project"])
    except:
        raise cherrypy.HTTPError("404 error: %s" % mid)
    slycat.web.server.authentication.require_project_reader(project)

    # amount of time it took to make the model
    if "finished" in model and model["finished"] is not None:
        delta_creation_time = (
            datetime.datetime.strptime(model["finished"], "%Y-%m-%dT%H:%M:%S.%f") - datetime.datetime.strptime(
                model["created"],
                "%Y-%m-%dT%H:%M:%S.%f")).total_seconds()
    else:
        delta_creation_time = 0

    if "job_running_time" in model and "artifact:job_submit_time" in model:
        delta_queue_time = (
            datetime.datetime.strptime(model["job_running_time"], "%Y-%m-%dT%H:%M:%S.%f") - datetime.datetime.strptime(
                model["artifact:job_submit_time"], "%Y-%m-%dT%H:%M:%S.%f")).total_seconds()
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

    if "model_delta_time" in model:
        model_compute_time = model["model_delta_time"]
    else:
        model_compute_time = 0

    if "pulling_time" in model:
        pulling_time = model["pulling_time"]
    else:
        pulling_time = 0

    # get hdf5 root dir
    hdf5_root_directory = cherrypy.tree.apps[""].config["slycat-web-server"]["data-store"]

    # get models hdf5 footprint
    hdf5_file_size = 0
    for key, value in model["artifact-types"].items():
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
        server_cache_size = float(sys.getsizeof(_pickle.dumps(slycat.web.server.server_cache.cache))) / 1024.0 / 1024.0
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
        "model_compute_time": float(model_compute_time) / 60,
        "pulling_time": float(pulling_time) / 60,
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
    # username/password are not guaranteed to exist within the incoming json
    # (they don't exist for rsa-cert auth)
    if username == None:
        username = cherrypy.request.login
        
    msg = ""
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
        for i in range(len(session["sessions"])):
            if session["sessions"][i]["hostname"] == hostname:
                if("sid" in session["sessions"][i] and session["sessions"][i]["sid"] is not None):
                    slycat.web.server.remote.delete_session(session["sessions"][i]["sid"])
                del session["sessions"][i]
        session["sessions"].append({"sid": sid, "hostname": hostname, "username": username, "session_type": "ssh"})
        database.save(session)
    except Exception as e:
        cherrypy.log.error("login could not save session for remotes %s" % e)
        msg = "login could not save session for remote host"
    return {"sid": sid, "status": True, "msg": msg}


@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def post_remotes_smb():
    """
      Given username, hostname, password as a json payload
      establishes a session with the remote host and attaches
      it to the users session
      :return: {"sid":sid, "status":boolean, msg:""}
      user_name password

      encode with in js

        b64EncodeUnicode(str) {
            return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
                return String.fromCharCode('0x' + p1);
            }));
        }
    """
    # try and decode the username and password
    username, password = slycat.web.server.decode_username_and_password()
    server = cherrypy.request.json["server"]
    share = cherrypy.request.json["share"]
    cherrypy.log.error("username:%s server:%s share:%s" % (username, server , share))
    if username == None:
        username = cherrypy.request.login
    msg = ""
    sid = slycat.web.server.smb.create_session(username,password,server,share)
    '''
    save sid to user session
    the session will be stored as follows in the users session
    {sessions:[{{"sid": sid,"hostname": hostname, "username": username}},...]}
    '''
    try:
        database = slycat.web.server.database.couchdb.connect()
        session = database.get("session", cherrypy.request.cookie["slycatauth"].value)
        for i in range(len(session["sessions"])):
            if session["sessions"][i]["hostname"] == server:
                if("sid" in session["sessions"][i] and session["sessions"][i]["sid"] is not None):
                    slycat.web.server.remote.delete_session(session["sessions"][i]["sid"])
                del session["sessions"][i]
        session["sessions"].append({"sid": sid, "hostname": server, "username": username, "session_type": "smb"})
        database.save(session)
    except Exception as e:
        cherrypy.log.error("login could not save session for remotes %s" % e)
        msg = "login could not save session for remote host"
    return {"sid": sid, "status": True, "msg": msg}

@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def post_smb_browse(hostname, path):
    cherrypy.log.error("path:%s hostname:%s" % (path, hostname))
    sid, session_type = get_sid(hostname)
    cherrypy.log.error("sid:%s path:%s hostname:%s" % (sid, path, hostname))
    with slycat.web.server.smb.get_session(sid) as session:
        return session.browse(path=path)

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
        share = ""
        for h_session in session["sessions"]:
            if h_session["hostname"] == hostname:
                if h_session["session_type"] == "ssh" and slycat.web.server.remote.check_session(h_session["sid"]):
                    status = True
                    msg = "hostname session was found"
                elif h_session["session_type"] == "smb" and slycat.web.server.smb.check_session(h_session["sid"]):
                    status = True
                    msg = "hostname session was found"
                    with slycat.web.server.smb.get_session(h_session["sid"]) as session:
                        share = session.getShare()
                else:
                    session["sessions"][:] = [tup for tup in session["sessions"] if tup["hostname"] != hostname]
                    database.save(session)

    except Exception as e:
        cherrypy.log.error("status could not save session for remotes %s" % e)
    return {"status": status, "msg": msg, "hostName": hostname, "share": share}


@cherrypy.tools.json_out(on=True)
def get_remote_show_user_password():
    """
    checks to see if the application needs to show password
    :return: json {show:bool, msg:msg}
    """
    ssh = False
    slycat_pass = False
    msg = "unknown"
    if cherrypy.request.app.config["slycat-web-server"]["remote-authentication"]["method"] == "password":
        ssh = True
        msg = "password auth required for remotes"
    if cherrypy.request.app.config["slycat-web-server"]["authentication"]["plugin"] == "slycat-password-authentication":
        slycat_pass = True
    return {"ssh": ssh, "slycat": slycat_pass, "msg": msg}


def delete_remote(sid):
    """
    TODO: this function needs review for deprecation as we no longer send the sid over

    Deletes a remote session created with POST /api/remotes
    
    Arguments:
        sid {string} -- unique session id
    """
    slycat.web.server.remote.delete_session(sid)
    cherrypy.response.status = "204 Remote deleted."


@cherrypy.tools.json_out(on=True)
def get_session_status(hostname):
    sid, session_type = get_sid(hostname)
    with slycat.web.server.remote.get_session(sid) as session:
        return "success"


@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def post_remote_launch(hostname):
    sid, session_type = get_sid(hostname)
    command = cherrypy.request.json["command"]
    with slycat.web.server.remote.get_session(sid) as session:
        return session.launch(command)


@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def post_submit_batch(hostname):
    sid, session_type = get_sid(hostname)
    filename = cherrypy.request.json["filename"]
    with slycat.web.server.remote.get_session(sid) as session:
        return session.submit_batch(filename)


@cherrypy.tools.json_out(on=True)
def get_checkjob(hostname, jid):
    sid, session_type = get_sid(hostname)
    with slycat.web.server.remote.get_session(sid) as session:
        return session.checkjob(jid)


@cherrypy.tools.json_out(on=True)
def delete_job(hostname, jid):
    sid, session_type = get_sid(hostname)
    with slycat.web.server.remote.get_session(sid) as session:
        return session.cancel_job(jid)


@cherrypy.tools.json_out(on=True)
def get_job_output(hostname, jid, path):
    sid, session_type = get_sid(hostname)
    with slycat.web.server.remote.get_session(sid) as session:
        return session.get_job_output(jid, path)


@cherrypy.tools.json_out(on=True)
def get_user_config(hostname):
    sid, session_type = get_sid(hostname)
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
    if int(nodes) < 0 or int(tasks) < 0 or int(size) < 0:
      time = None
    else:
      time = int(1.8 * float(size)) / (float(nodes) * float(tasks)) + 900
    return {
            'time-seconds': time,
            'nodes': nodes,
            'tasks': tasks,
            'size': size
           }  # return an approximation based on size, nodes, and tasks for now


@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def set_user_config(hostname):
    # TODO add user config mapping
    sid, session_type = get_sid(hostname)
    config = cherrypy.request.json["config"]
    cherrypy.log.error("user_config %s" % config)
    with slycat.web.server.remote.get_session(sid) as session:
        return session.set_user_config(config)


@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def post_remote_command(hostname):
    """
    run a remote command from the list of pre-registered commands
    that are located on a remote agent.
    Parameters
    ----------
    hostname: str
    name of the hpc host
    Returns
    ------- 
    json
      message: string
      a message that is supplied by the agent
      command: string
      an echo of the command that was sent to the server and the agent,
      error: bool
      boolean describing if there was an agent error,
      available_scripts:  list
      list of available scripts from the agent
      name: string
      script_name
      description: string
      script_description
      parameters: list
      name: string
      parameter_name as string,
      description: string
      description of the param string,
      example: string
      example usage string
      type: string
      field type eg string, int...
    """
    sid, session_type = get_sid(hostname)
    command = cherrypy.request.json["command"]
    with slycat.web.server.remote.get_session(sid) as session:
        return session.run_remote_command(command)


@cherrypy.tools.json_out(on=True)
def get_remote_job_status(hostname, jid):
    sid, session_type = get_sid(hostname)
    with slycat.web.server.remote.get_session(sid) as session:
        return session.get_remote_job_status(jid)


@cherrypy.tools.json_in(on=True)
@cherrypy.tools.json_out(on=True)
def post_remote_browse(hostname, path):
    sid, session_type = get_sid(hostname)
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
      Uses an existing remote session to retrieve a remote file.  The remote
      session must have been created using :http:post:`/api/remotes`.  Use
      :http:post:`/api/remotes/(hostname)/browse(path)` to lookup remote file paths.
      The returned file may be optionally cached on the server and retrieved
      using :http:get:`/api/projects/(pid)/cache/(key)`.

      Parameters
      ----------
      hostname: string
                connection host name
      path: string
            path to file
      kwargs: json
        cache: – 
          Optional cache identifier. 
          Set to project to store the retrieved file in a project cache.
        project: uuid
                 Project identifier. Required when cache is set to project.
        key: uuid
             Cached object key. Must be specified when cache is set to project.
      Returns
      ------- 
      file: binary
            the file that was asked for

      Raises
      ------
      200 OK
        The requested file is returned in the body of the response.
      404 Not Found
        The session doesn’t exist or has timed-out.
      400 Bad Request
        “Can’t read directory” The remote path is a directory instead of a file.
      400 Bad Request
        “File not found” The remote path doesn’t exist.
      400 Bad Request
        “Access denied” The session user doesn’t have permissions to access the file.
    """

    sid, session_type = get_sid(hostname)
    if session_type == 'smb':
        with slycat.web.server.smb.get_session(sid) as session:
            split_list = path.split('/')
            del split_list[1]
            del split_list[0]
            content_type, encoding = slycat.mime_type.guess_type(path)
            if content_type is None:
                content_type = "application/octet-stream"
            cherrypy.response.headers["content-type"] = content_type
            return session.get_file(path='/{0}'.format('/'.join(split_list)))
    else:
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
    sid, session_type = get_sid(hostname)
    with slycat.web.server.remote.get_session(sid) as session:
        return session.get_image(path, **kwargs)

#TODO: clean up everything
@cherrypy.tools.json_out(on=True)
def get_time_series_names(hostname, path, **kwargs):
    """
    Parse a time series csv for all column names
    :param hostname: connection host name
    :param path: path to csv file
    :param kwargs:
    :return: json object of column names
    """
    sid, session_type = get_sid(hostname)
    with slycat.web.server.remote.get_session(sid) as session:
        csv_file = str(session.get_file(path, **kwargs).decode("utf-8"))
    csv_file = csv_file.replace("\\r\\n","\r\n")
    rows = [row.split(",") for row in csv_file.splitlines()]
    column_names = [name.strip() for name in rows[0]]
    def _isNumeric(j):
        """"
        Check if the input object is a numerical value, i.e. a float
        :param j: input object to check
        :return: boolean
        """
        try:
            x = float(j)
        except ValueError:
            return False
        return True

    column_types = []
    for item in rows[1]:
        if _isNumeric(item):
            column_types.append("numeric")
        else:
            column_types.append("string")
    rows = rows[1:]  # removes first row (header)

    file_extensions = {".csv", ".dat", ".prn", "csv", "dat", "prn"}
    response_time_series_names = []
    for i, val in enumerate(rows[0]):
        if column_types[i] == "string":
            file_ext = val[-3:]
            if file_ext in file_extensions:
                response_time_series_names.append(column_names[i])
    if len(response_time_series_names) >= 1:
        return response_time_series_names
    else:
        raise cherrypy.HTTPError("400 could not detect timeseries names. There could be hidden characters in your csv")


def get_remote_video(hostname, vsid):
    """
    Given a hostname and vsid returns the video given
    by the vsid
    :param hostname: connection host name
    :param vsid: video uuid
    :return: video
    """
    sid, session_type = get_sid(hostname)
    with slycat.web.server.remote.get_session(sid) as session:
        return session.get_video(vsid)


def post_events(event):
    # We don't actually have to do anything here, since the request is already logged.
    cherrypy.response.status = "204 Event logged."


@cherrypy.tools.json_out(on=True)
def get_configuration_markings():
    return [dict(list(marking.items()) + [("type", key)]) for key, marking in
            list(slycat.web.server.plugin.manager.markings.items()) if
            key in cherrypy.request.app.config["slycat-web-server"]["allowed-markings"]]

@cherrypy.tools.json_out(on=True)
def get_selectable_configuration_markings():
    return [dict(list(marking.items()) + [("type", key)]) for key, marking in
            list(slycat.web.server.plugin.manager.markings.items()) if
            key in cherrypy.request.app.config["slycat-web-server"]["selectable-markings"]]

@cherrypy.tools.json_out(on=True)
def get_configuration_parsers():
    return [{"type": key, "label": parser["label"], "categories": parser["categories"]} for key, parser in
            list(slycat.web.server.plugin.manager.parsers.items())]


@cherrypy.tools.json_out(on=True)
def get_configuration_remote_hosts():
    remote_hosts = []
    for hostname, remote in list(cherrypy.request.app.config["slycat-web-server"]["remote-hosts"].items()):
        agent = True if remote.get("agent", False) else False
        remote_hosts.append({"hostname": hostname, "agent": agent})
    return remote_hosts

@cherrypy.tools.json_out(on=True)
def get_configuration_smb_remote_hosts():
    if "smb-remote-hosts" in cherrypy.request.app.config["slycat-web-server"]:
        hostnames = cherrypy.request.app.config["slycat-web-server"]["smb-remote-hosts"]
        json_hostnames = {"hostnames": hostnames}
        return json_hostnames
    return {"hostnames":[]}

@cherrypy.tools.json_out(on=True)
def get_configuration_smb_domains():
    """
    Returns the SMB domains from the slycat web server 
    configuration file
    :return: domain names
    """
    if "smb-domains" in cherrypy.request.app.config["slycat-web-server"]:
        domains = cherrypy.request.app.config["slycat-web-server"]["smb-domains"]
        json_domains = {"domains": domains}
        return json_domains
    return {"domains":[]}

@cherrypy.tools.json_out(on=True)
def get_configuration_support_email():
    return cherrypy.request.app.config["slycat-web-server"]["support-email"]

@cherrypy.tools.json_out(on=True)
def get_configuration_ga_tracking_id():
    return cherrypy.request.app.config["slycat-web-server"].get("ga-tracking-id", "")


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
    return {"version": slycat.__version__, "commit": get_configuration_version.commit.decode('utf-8')}


get_configuration_version.lock = threading.Lock()
get_configuration_version.initialized = False
get_configuration_version.commit = None


@cherrypy.tools.json_out(on=True)
def get_configuration_wizards():
    return [dict([("type", type)] + list(wizard.items())) for type, wizard in
            list(slycat.web.server.plugin.manager.wizards.items())]


def tests_request(*arguments, **keywords):
    cherrypy.log.error("Request: %s" % cherrypy.request.request_line)
    cherrypy.log.error("  Remote IP: %s" % cherrypy.request.remote.ip)
    cherrypy.log.error("  Remote Port: %s" % cherrypy.request.remote.port)
    cherrypy.log.error("  Remote Hostname: %s" % cherrypy.request.remote.name)
    cherrypy.log.error("  Scheme: %s" % cherrypy.request.scheme)
    for key, value in sorted(cherrypy.request.headers.items()):
        cherrypy.log.error("  Header: %s=%s" % (key, value))
    cherrypy.response.status = 200
