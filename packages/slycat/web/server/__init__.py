# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import os
import shutil
import uuid
import datetime
import cherrypy
import numpy
import paramiko
import json
import slycat.hdf5
import slycat.hyperchunks
import slycat.web.server.hdf5
import slycat.web.server.remote
from slycat.web.server.cache import Cache
from urllib.parse import urlparse, parse_qs
import functools
import threading
import base64
import six
import time

config = {}
cache_it = Cache(seconds=1000000)  # 277.777778 hours
model_locks = {}
project_data_locks = {}

def tonative(n, encoding='ISO-8859-1'):
    """Return the given string as a native string in the given encoding."""
    # In Python 2, the native string type is bytes.
    if isinstance(n, six.text_type):  # unicode for Python 2
        return n.encode(encoding)
    return n

def base64_decode(n, encoding='ISO-8859-1'):	
    """Return the native string base64-decoded (as a native string)."""	
    decoded = base64.decodestring(n.encode('ascii'))	
    return tonative(decoded, encoding)

def mix(a, b, amount):
    """Linear interpolation between two numbers.  Useful for computing model progress."""
    return ((1.0 - amount) * a) + (amount * b)


# @cache_it
def evaluate(hdf5_array, expression, expression_type, expression_level=0):
    """Evaluate a hyperchunk expression."""
    # cherrypy.log.error("%sEvaluating %s expression: %s" % (
    #     "  " * expression_level, expression_type, slycat.hyperchunks.tostring(expression)))
    if isinstance(expression, int):
        return expression
    elif isinstance(expression, float):
        return expression
    elif isinstance(expression, str):
        return expression
    elif isinstance(expression, slycat.hyperchunks.grammar.AttributeIndex):
        return hdf5_array.get_data(expression.index)[...]
    elif isinstance(expression, slycat.hyperchunks.grammar.BinaryOperator):
        left = evaluate(hdf5_array, expression.operands[0], expression_type, expression_level + 1)
        for operand in expression.operands[1:]:
            right = evaluate(hdf5_array, operand, expression_type, expression_level + 1)
            # cherrypy.log.error("left::%s \n right::%s" % (left, right))
            if expression.operator == "<":
                left = left < right
            elif expression.operator == ">":
                left = left > right
            elif expression.operator == "<=":
                left = left <= right
            elif expression.operator == ">=":
                left = left >= right
            elif expression.operator == "==":
                if numpy.isnan(right):
                    left = numpy.isnan(left)
                else:
                    left = left == right
            elif expression.operator == "!=":
                left = left != right
            elif expression.operator == "and":
                left = numpy.logical_and(left, right)
            elif expression.operator == "or":
                left = numpy.logical_or(left, right)
            elif expression.operator == "in":
                left = numpy.in1d(left, right)
            elif expression.operator == "not in":
                left = numpy.in1d(left, right, invert=True)
            else:
                cherrypy.log.error("slycat.web.server.__init__.py evaluate",
                                        "Unknown operator: %s" % expression.operator)
                raise ValueError("Unknown operator: %s" % expression.operator)
        return left
    elif isinstance(expression, slycat.hyperchunks.grammar.FunctionCall):
        if expression.name == "index":
            return numpy.indices(hdf5_array.shape)[expression.args[0]]
        elif expression.name == "rank":
            values = evaluate(hdf5_array, expression.args[0], expression_type, expression_level + 1)
            order = numpy.argsort(values)
            if expression.args[1] == "desc":
                order = order[::-1]
            return order
        else:
            cherrypy.log.error("slycat.web.server.__init__.py evaluate", "Unknown function: %s" % expression.name)
            raise ValueError("Unknown function: %s" % expression.name)
    elif isinstance(expression, slycat.hyperchunks.grammar.List):
        return expression.values
    else:
        cherrypy.log.error("slycat.web.server.__init__.py evaluate", "Unknown expression: %s" % expression)
        raise ValueError("Unknown expression: %s" % expression)


def update_model(database, model, **kwargs):
    """
  Update the model, and signal any waiting threads that it's changed.
  will only update model base on "state", "result", "started", "finished", "progress", "message"
  """
    for name, value in list(kwargs.items()):
        if name in ["state", "result", "started", "finished", "progress", "message"]:
            model[name] = value
    database.save(model)

def parse_existing_file(database, parser, input, attachment, model, aid):
    """
    calls the parse function specified by the registered parser
    :return: not used
    """
    kwargs = {}
    aids = []
    aids.append(aid)
    try:
        slycat.web.server.plugin.manager.parsers[parser]["parse"](database, model, input, attachment,
                                                                  aids, **kwargs)
    except Exception as e:
        cherrypy.log.error("[MICROSERVICE] Exception parsing posted files: %s" % e)
        import traceback
        cherrypy.log.error(traceback.format_exc())
    cherrypy.log.error("[MICROSERVICE] Upload parsing finished.")

@cache_it
def get_model_arrayset_metadata(database, model, aid, arrays=None, statistics=None, unique=None):
    """Retrieve metadata describing an arrayset artifact.
  Parameters
  ----------
  database: database object, required
  model: model object, required
  aid: string, required
    Unique (to the model) arrayset artifact id.
  arrays: string or hyperchunks parse tree, optional
    Specifies a collection of arrays, in :ref:`Hyperchunks` format.  Metadata
    describing the specified arrays will be returned in the results.
  statistics: string or hyperchunks parse tree, optional
    Specifies a collection of array attributes, in :ref:`Hyperchunks` format.
    Statistics describing each attribute will be returned in the results.
  unique: string or hyperchunks parse tree, optional
    Specifies a collection of array attributes, in :ref:`Hyperchunks` format.
    Unique values from each attribute will be returned in the results.
  Returns
  -------
  metadata: dict
  See Also
  --------
  :http:get:`/models/(mid)/arraysets/(aid)/metadata`
  """
    if isinstance(arrays, str):
        arrays = slycat.hyperchunks.parse(arrays)
    if isinstance(statistics, str):
        statistics = slycat.hyperchunks.parse(statistics)
    if isinstance(unique, str):
        unique = slycat.hyperchunks.parse(unique)

    # Handle legacy behavior.
    if arrays is None and statistics is None and unique is None:
        with slycat.web.server.hdf5.lock:
            with slycat.web.server.hdf5.open(model["artifact:%s" % aid], "r+") as file:
                hdf5_arrayset = slycat.hdf5.ArraySet(file)
                results = []
                for array in sorted(hdf5_arrayset.keys()):
                    hdf5_array = hdf5_arrayset[array]
                    results.append({
                        "array": int(array),
                        "index": int(array),
                        "dimensions": hdf5_array.dimensions,
                        "attributes": hdf5_array.attributes,
                        "shape": tuple([dimension["end"] - dimension["begin"] for dimension in hdf5_array.dimensions]),
                    })
                return results

    with slycat.web.server.hdf5.lock:
        with slycat.web.server.hdf5.open(model["artifact:%s" % aid],
                                         "r+") as file:  # We have to open the file with writing enabled in case the statistics cache needs to be updated.
            hdf5_arrayset = slycat.hdf5.ArraySet(file)
            results = {}
            if arrays is not None:
                results["arrays"] = []
                for array in slycat.hyperchunks.arrays(arrays, hdf5_arrayset.array_count()):
                    hdf5_array = hdf5_arrayset[array.index]
                    results["arrays"].append({
                        "index": array.index,
                        "dimensions": hdf5_array.dimensions,
                        "attributes": hdf5_array.attributes,
                        "shape": tuple([dimension["end"] - dimension["begin"] for dimension in hdf5_array.dimensions]),
                    })
            if statistics is not None:
                results["statistics"] = []
                for array in slycat.hyperchunks.arrays(statistics, hdf5_arrayset.array_count()):
                    hdf5_array = hdf5_arrayset[array.index]
                    for attribute in array.attributes(len(hdf5_array.attributes)):
                        statistics = {}
                        statistics["array"] = array.index
                        if isinstance(attribute.expression, slycat.hyperchunks.grammar.AttributeIndex):
                            statistics["attribute"] = attribute.expression.index
                            statistics.update(hdf5_array.get_statistics(attribute.expression.index))
                        else:
                            values = evaluate(hdf5_array, attribute.expression, "statistics")
                            statistics["min"] = values.min()
                            statistics["max"] = values.max()
                            statistics["unique"] = len(numpy.unique(values))
                        results["statistics"].append(statistics)

            if unique is not None:
                results["unique"] = []
                for array in slycat.hyperchunks.arrays(unique, hdf5_arrayset.array_count()):
                    hdf5_array = hdf5_arrayset[array.index]
                    for attribute in array.attributes(len(hdf5_array.attributes)):
                        unique = {}
                        unique["array"] = array.index
                        unique["values"] = []
                        if isinstance(attribute.expression, slycat.hyperchunks.grammar.AttributeIndex):
                            for hyperslice in attribute.hyperslices():
                                unique["attribute"] = attribute.expression.index
                                unique["values"].append(
                                    hdf5_array.get_unique(attribute.expression.index, hyperslice)["values"])
                        else:
                            values = evaluate(hdf5_array, attribute.expression, "uniques")
                            for hyperslice in attribute.hyperslices():
                                unique["values"].append(numpy.unique(values)[hyperslice])
                        if isinstance(unique["values"][0], list):
                            unique["values"] = [a.tolist() for a in unique["values"]]
                        results["unique"].append(unique)

            return results


@cache_it
def get_model_arrayset_data(database, model, aid, hyperchunks):
    """
    Read data from an arrayset artifact.
    Parameters
    ----------
    database: database object, required
    model: model object, required
    aid: string, required
      Unique (to the model) arrayset artifact id.
    hyperchunks: string or hyperchunks parse tree, required
      Specifies the data to be retrieved, in :ref:`Hyperchunks` format.
    Returns
    -------
    data: sequence of numpy.ndarray data chunks.
    See Also
    --------
    :http:get:`/models/(mid)/arraysets/(aid)/data`
    """
    if isinstance(hyperchunks, str):
        hyperchunks = slycat.hyperchunks.parse(hyperchunks)
    return_list = []
    with slycat.web.server.hdf5.lock:
        with slycat.web.server.hdf5.open(model["artifact:%s" % aid], "r+") as file:
            hdf5_arrayset = slycat.hdf5.ArraySet(file)
            for array in slycat.hyperchunks.arrays(hyperchunks, hdf5_arrayset.array_count()):
                hdf5_array = hdf5_arrayset[array.index]
                if array.order is not None:
                    order = evaluate(hdf5_array, array.order, "order")
                for attribute in array.attributes(len(hdf5_array.attributes)):
                    values = evaluate(hdf5_array, attribute.expression, "attribute")
                    for hyperslice in attribute.hyperslices():
                        if array.order is not None:
                            return_list.append(values[order][hyperslice])
                        else:
                            return_list.append(values[hyperslice])
    return return_list


def get_model_parameter(database, model, aid):
    key = "artifact:%s" % aid
    if key not in model:
        # cherrypy.log.error("slycat.web.server.__init__.py get_model_parameter", "Unknown artifact: %s" % aid)
        raise KeyError("Unknown artifact: %s" % aid)
    return model["artifact:" + aid]


def put_model_arrayset(database, model, aid, input=False):
    """
  Start a new model array set artifact.
  :param database: the database with our model
  :param model: the model
  :param aid: artifact id
  :param input:
  :return:
  """
    with get_model_lock(model["_id"]):
        model = database.get('model',model["_id"])
        slycat.web.server.update_model(database, model, message="Starting array set %s." % (aid))
        storage = uuid.uuid4().hex
        with slycat.web.server.hdf5.lock:
            with slycat.web.server.hdf5.create(storage) as file:
                arrayset = slycat.hdf5.start_arrayset(file)
                database.save({"_id": storage, "type": "hdf5"})
                model = database.get('model',model["_id"])
                model["artifact:%s" % aid] = storage
                model["artifact-types"][aid] = "hdf5"
                if input:
                    model["input-artifacts"] = list(set(model["input-artifacts"] + [aid]))
                database.save(model)


def put_model_array(database, model, aid, array_index, attributes, dimensions):
    """
  store array for model
  
  :param database: database of model
  :param model: model as an object
  :param aid: artifact id (eg data-table)
  :param array_index: index of the array
  :param attributes: name and type in column
  :param dimensions: number of data rows
  :return:
  """
    with get_model_lock(model["_id"]):
        model = database.get('model', model['_id'])
        slycat.web.server.update_model(database, model, message="Starting array set %s array %s." % (aid, array_index))
        storage = model["artifact:%s" % aid]
        with slycat.web.server.hdf5.lock:
            with slycat.web.server.hdf5.open(storage, "r+") as file:
                slycat.hdf5.ArraySet(file).start_array(array_index, dimensions, attributes)


def put_model_arrayset_data(database, model, aid, hyperchunks, data):
    """Write data to an arrayset artifact.

  Parameters
  ----------
  database: database object, required
  model: model object, required
  aid: string, required
    Unique (to the model) arrayset artifact id.
  hyperchunks: string or hyperchunks parse tree, required
    Specifies where the data will be stored, in :ref:`Hyperchunks` format.
  data: iterable, required)
    A collection of numpy.ndarray data chunks to be stored.  The number of
    data chunks must match the number implied by the `hyperchunks` parameter.

  See Also
  --------
  :http:put:`/models/(mid)/arraysets/(aid)/data`
  """
    cherrypy.log.error("put_model_arrayset_data called with: {}".format(aid))
    if isinstance(hyperchunks, str):
        hyperchunks = slycat.hyperchunks.parse(hyperchunks)

    data = iter(data)

    with get_model_lock(model["_id"]):
        model = database.get('model', model['_id'])
        slycat.web.server.update_model(database, model, message="Storing data to array set %s." % (aid))

    with slycat.web.server.hdf5.lock:
        with slycat.web.server.hdf5.open(model["artifact:%s" % aid], "r+") as file:
            hdf5_arrayset = slycat.hdf5.ArraySet(file)
            for array in slycat.hyperchunks.arrays(hyperchunks, hdf5_arrayset.array_count()):
                hdf5_array = hdf5_arrayset[array.index]
                for attribute in array.attributes(len(hdf5_array.attributes)):
                    if not isinstance(attribute.expression, slycat.hyperchunks.grammar.AttributeIndex):
                        cherrypy.log.error("slycat.web.server.__init__.py put_model_arrayset_data",
                                                "Cannot write to computed attribute.")
                        raise ValueError("Cannot write to computed attribute.")

                    stored_type = slycat.hdf5.dtype(hdf5_array.attributes[attribute.expression.index]["type"])
                    for hyperslice in attribute.hyperslices():
                        data_hyperslice = next(data)
                        if isinstance(data_hyperslice, list):
                            data_hyperslice = numpy.array(data_hyperslice, dtype=stored_type)
                        hdf5_array.set_data(attribute.expression.index, hyperslice, data_hyperslice)
            file.close()


def put_model_file(database, model, aid, value, content_type, input=False):
    with get_model_lock(model["_id"]):
        fid = database.write_file(model, content=value, content_type=content_type)
        model = database[model[
            "_id"]]  # This is a workaround for the fact that put_attachment() doesn't update the revision number for us.
        model["artifact:%s" % aid] = fid
        model["artifact-types"][aid] = "file"
        if input:
            model["input-artifacts"] = list(set(model["input-artifacts"] + [aid]))
        database.save(model)
        return model


def get_model_file(database, model, aid):
    artifact = model.get("artifact:%s" % aid, None)
    if artifact is None:
        raise cherrypy.HTTPError(404)
    artifact_type = model["artifact-types"][aid]
    if artifact_type != "file":
        raise cherrypy.HTTPError("400 %s is not a file artifact." % aid)
    fid = artifact
    return database.get_attachment(model, fid)


def put_model_inputs(database, model, source, deep_copy=False):
    with get_model_lock(model["_id"]):
        slycat.web.server.update_model(database, model, message="Copying existing model inputs.")
        for aid in source["input-artifacts"]:
            original_type = source["artifact-types"][aid]
            original_value = source["artifact:%s" % aid]

            if original_type == "json":
                model["artifact:%s" % aid] = original_value
            elif original_type == "hdf5":
                if deep_copy:
                    new_value = uuid.uuid4().hex
                    os.makedirs(os.path.dirname(slycat.web.server.hdf5.path(new_value)))
                    with slycat.web.server.hdf5.lock:
                        shutil.copy(slycat.web.server.hdf5.path(original_value), slycat.web.server.hdf5.path(new_value))
                        model["artifact:%s" % aid] = new_value
                        database.save({"_id": new_value, "type": "hdf5"})
                else:
                    model["artifact:%s" % aid] = original_value
            elif original_type == "file":
                original_content = database.get_attachment(source["_id"], original_value)
                original_content_type = source["_attachments"][original_value]["content_type"]

                database.put_attachment(model, original_content, filename=original_value,
                                        content_type=original_content_type)
                model["artifact:%s" % aid] = original_value
            else:
                cherrypy.log.error("slycat.web.server.__init__.py put_model_inputs",
                                        "Cannot copy unknown input artifact type %s." % original_type)
                raise Exception("Cannot copy unknown input artifact type %s." % original_type)
            model["artifact-types"][aid] = original_type
            model["input-artifacts"] = list(set(model["input-artifacts"] + [aid]))

        model["_rev"] = database[model["_id"]][
            "_rev"]  # This is a workaround for the fact that put_attachment() doesn't update the revision number for us.
        database.save(model)

def get_project_data_lock(did):
    if did in project_data_locks:
        return project_data_locks[did]
    project_data_locks[did] = threading.Lock()
    return project_data_locks[did]

def get_model_lock(model_id):
    if model_id in model_locks:
        return model_locks[model_id]
    model_locks[model_id] = threading.Lock()
    return model_locks[model_id]

def put_project_data_parameter(database, project_data, aid, value, input=False):
    with get_project_data_lock(project_data["_id"]):
        project_data["artifact:%s" % aid] = value
        # Alex commenting this out since it results in a KeyError: 'artifact-types'
        # because there is no 'artifact-types' key on a project_data 
        # project_data["artifact-types"][aid] = "json"
        if input:
            project_data["input-artifacts"] = list(set(project_data["input-artifacts"] + [aid]))
        database.save(project_data)

def put_model_parameter(database, model, aid, value, input=False):
    with get_model_lock(model["_id"]):
        try:
            model = database.get('model',model['_id'])
            model["artifact:%s" % aid] = value
            model["artifact-types"][aid] = "json"
            if input:
                model["input-artifacts"] = list(set(model["input-artifacts"] + [aid]))
            database.save(model)
        except Exception as e:
            time.sleep(1)
            model = database.get('model',model['_id'])
            model["artifact:%s" % aid] = value
            model["artifact-types"][aid] = "json"
            if input:
                model["input-artifacts"] = list(set(model["input-artifacts"] + [aid]))
            database.save(model)


def delete_model_parameter(database, model, aid):
    """
    Delete a model parameter in the couch database
    :param database: 
    :param model: model from the couchdb
    :param aid: artifact id
    :return: not used
    """
    with get_model_lock(model["_id"]):
        del model["artifact:%s" % aid]
        del model["artifact-types"][aid]
        database.save(model)


def create_session(hostname, username, password):
    """Create a cached remote session for the given host.

  Parameters
  ----------
  hostname : string
    Name of the remote host to connect via SSH.
  username : string
    Username for SSH authentication.
  password : string
    Password for SSH authentication

  Returns
  -------
  sid : string
    A unique session identifier.
  """
    return slycat.web.server.remote.create_session(hostname, username, password, None)


def checkjob(sid, jid):
    """Submits a command to the slycat-agent to check the status of a submitted job to a cluster running SLURM.

  Parameters
  ----------
  sid : int
    Session identifier
  jid : int
    Job identifier

  Returns
  -------
  response : dict
    A dictionary with the following keys: jid, status, errors
  """
    with slycat.web.server.remote.get_session(sid) as session:
        return session.checkjob(jid)


def get_remote_file(sid, path):
    """Returns the content of a file from a remote system.

  Parameters
  ----------
  sid : int
    Session identifier
  path : string
    Path for the requested file

  Returns
  -------
  content : string
    Content of the requested file
  """
    with slycat.web.server.remote.get_session(sid) as session:
        return session.get_file(path)

def write_remote_file(sid, path, data):
    """Returns the content of a file from a remote system.

  Parameters
  ----------
  sid : int
    Session identifier
  path : string
    Path for the requested file

  Returns
  -------
  content : string
    Content of the requested file
  """
    with slycat.web.server.remote.get_session(sid) as session:
        return session.write_file(path, data)

def get_remote_file_server(client, sid, path):
    """Returns the content of a file from a remote system.

  Parameters
  ----------
  sid : int
    Session identifier
  path : string
    Path for the requested file

  Returns
  -------
  content : string
    Content of the requested file
  """
    with slycat.web.server.remote.get_session_server(client, sid) as session:
        return session.get_file(path)


def post_model_file(mid, input=None, sid=None, path=None, aid=None, parser=None, client=None, **kwargs):
    if input is None:
        cherrypy.log.error("slycat.web.server.__init__.py put_model_file", "Required input parameter is missing.")
        raise Exception("Required input parameter is missing.")

    if path is not None and sid is not None:
        if client is not None:
            with slycat.web.server.remote.get_session_server(client, sid) as session:
                filename = "%s@%s:%s" % (session.username, session.hostname, path)
                # TODO verify that the file exists first...
                file = session.sftp.file(path).read()
        else:
            with slycat.web.server.remote.get_session(sid) as session:
                filename = "%s@%s:%s" % (session.username, session.hostname, path)
                # TODO verify that the file exists first...
                file = session.sftp.file(path).read()
    else:
        cherrypy.log.error("slycat.web.server.__init__.py post_model_file", "Must supply path and sid parameters.")
        raise Exception("Must supply path and sid parameters.")

    if parser is None:
        Exception("Required parser parameter is missing.")
    if parser not in slycat.web.server.plugin.manager.parsers:
        cherrypy.log.error("slycat.web.server.__init__.py post_model_file", "Unknown parser plugin: %s." % parser)
        raise Exception("Unknown parser plugin: %s." % parser)

    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)

    try:
        slycat.web.server.plugin.manager.parsers[parser]["parse"](database, model, input, [file], [aid], **kwargs)
    except Exception as e:
        cherrypy.log.error("slycat.web.server.__init__.py post_model_file", "%s" % e)
        raise Exception("%s" % e)


def ssh_connect(hostname=None, username=None, password=None):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    if slycat.web.server.config["slycat-web-server"]["remote-authentication"]["method"] == "certificate":
        import traceback
        _certFn = "gen-rsa-ssh-cert"
        if _certFn not in slycat.web.server.plugin.manager.utilities:
            raise Exception("Unknown ssh_connect plugin: %s." % _certFn)

        try:
            # get SSH cert from SSO server
            RSAcert = slycat.web.server.plugin.manager.utilities[_certFn]()
            ssh.connect(hostname=hostname, username=cherrypy.request.login, pkey=RSAcert,
                        port=slycat.web.server.config["slycat-web-server"]["remote-authentication"]["port"])
        except paramiko.AuthenticationException as e:
            cherrypy.log.error("ssh_connect cert method, authentication failed for %s@%s: %s" % (
                cherrypy.request.login, hostname, str(e)))
            cherrypy.log.error("ssh_connect cert method, called ssh.connect traceback: %s" % traceback.print_exc())
            raise cherrypy.HTTPError("403 Remote authentication failed.")
    else:
        try:
            ssh.connect(hostname=hostname, username=username, password=password)
        except paramiko.AuthenticationException as e:
            cherrypy.log.error("ssh_connect username/password method, authentication failed for %s@%s: %s" % (
                username, hostname, str(e)))
            raise cherrypy.HTTPError("403 Remote authentication failed.")

    ssh.get_transport().set_keepalive(5)
    return ssh


def get_password_function():
    if get_password_function.password_check is None:
        if "password-check" not in cherrypy.request.app.config["slycat-web-server"]:
            raise cherrypy.HTTPError("500 No password check configured.")
        plugin = cherrypy.request.app.config["slycat-web-server"]["password-check"]["plugin"]
        args = cherrypy.request.app.config["slycat-web-server"]["password-check"].get("args", [])
        kwargs = cherrypy.request.app.config["slycat-web-server"]["password-check"].get("kwargs", {})
        if plugin not in list(slycat.web.server.plugin.manager.password_checks.keys()):
            cherrypy.log.error("slycat-standard-authentication.py authenticate",
                                    "cherrypy.HTTPError 500 no password check plugin found.")
            raise cherrypy.HTTPError("500 No password check plugin found.")
        get_password_function.password_check = functools.partial(
            slycat.web.server.plugin.manager.password_checks[plugin], *args,
            **kwargs)
    return get_password_function.password_check


get_password_function.password_check = None


def response_url():
    """
    get the resonse_url and clean it to make sure
    that we are not being spoofed
    :return: url to route to once signed in
    """
    current_url = urlparse(cherrypy.url())  # gets current location on the server
    try:
        location = cherrypy.request.json["location"]
        if parse_qs(urlparse(location['href']).query)['from']:  # get from query href
            cleaned_url = parse_qs(urlparse(location['href']).query)['from'][0]
            if not cleaned_url.__contains__(
                    current_url.netloc):  # check net location to avoid cross site script attacks
                # No longer need to add projects to root url, so removing 
                # cleaned_url = "https://" + current_url.netloc + "/projects"
                cleaned_url = "https://" + current_url.netloc
        else:
            # No longer need to add projects to root url, so removing 
            # cleaned_url = "https://" + current_url.netloc + "/projects"
            cleaned_url = "https://" + current_url.netloc
    except Exception as e:
        # cherrypy.log.error("no location provided setting target to /projects")
        # No longer need to add projects to root url, so removing 
        # cleaned_url = "https://" + current_url.netloc + "/projects"
        cleaned_url = "https://" + current_url.netloc
    return cleaned_url


def decode_username_and_password():
    """
    decode the url from the json that was passed to us
    :return: decoded url and password as a tuple
    """
    try:
        # cherrypy.log.error("decoding username and password")
        user_name = str(base64_decode(cherrypy.request.json["user_name"]).decode())
        password = str(base64_decode(cherrypy.request.json["password"]).decode())

        # try and get the redirect path for after successful login
        try:
            location = cherrypy.request.json["location"]
        except Exception as e:
            location = None
            # cherrypy.log.error("no location provided moving on")
    except Exception as e:
        # cherrypy.log.error("username and password could not be decoded")
        cherrypy.log.error("slycat-standard-authentication.py authenticate", "cherrypy.HTTPError 400")
        raise cherrypy.HTTPError(400)
    return user_name, password


def clean_up_old_session(user_name=None):
    """
    try and delete any outdated sessions
    for the user if they have the cookie for it
    :return:no-op
    """
    cherrypy.log.error("cleaning all sessions for %s" % user_name)
    if "slycatauth" in cherrypy.request.cookie:
        try:
            # cherrypy.log.error("found old session trying to delete it ")
            sid = cherrypy.request.cookie["slycatauth"].value
            couchdb = slycat.web.server.database.couchdb.connect()
            session = couchdb.get("session", sid)
            if session is not None:
                couchdb.delete(session)
        except:
            # if an exception was throw there is nothing to be done
            pass
    if user_name is not None:
        try:
            couchdb = slycat.web.server.database.couchdb.connect()
            sessions = [session for session in couchdb.scan("slycat/sessions") if
                        session["creator"] == user_name]
            if sessions:
                #cherrypy.log.error("sessions found %s" % user_name)
                for session in sessions:
                    couchdb.delete(session)
                    #cherrypy.log.error("sessions deleted %s" % user_name)
        except:
            # if an exception was throw there is nothing to be done
            pass


def check_user(session_user, apache_user, sid):
    """
    check to see if the session user is equal to the apache user raise 403 and delete the
    session if they are not equal
    :param session_user: user_name in the couchdb use session
    :param apache_user: user sent in the apache header "authuser"
    :param couchdb: hook to couch
    :param sid: session id
    :param session: session object from couch
    :return:
    """
    if session_user != apache_user:
        cherrypy.log.error("session_user::%s is not equal to apache_user::%s in standard auth"
                           "deleting session and throwing 403 error to the browser" % (session_user, apache_user))
        # force a lock so only one delete is called at a time
        with slycat.web.server.database.couchdb.db_lock:
            # we need to wrap this in a try catch in case the session is already removed
            try:
                couchdb = slycat.web.server.database.couchdb.connect()
                session = couchdb.get("session", sid)
                couchdb.delete(session)
            except:
                # if we errored here the session has already been removed so we just need to return
                pass
        # expire the old cookie
        cherrypy.response.cookie["slycatauth"] = sid
        cherrypy.response.cookie["slycatauth"]['expires'] = 0
        cherrypy.response.status = "403 Forbidden"
        raise cherrypy.HTTPError(403)


def create_single_sign_on_session(remote_ip, auth_user, secure=True):
    """
    WSGI/RevProxy no-login session creations.
    Successful authentication and access verification,
    create a session and return.
    :return: not used
    """
    # must define groups but not populating at the moment !!!
    groups = []

    # Successful authentication and access verification, create a session and return.
    cherrypy.log.error("++ create_single_sign_on_session creating session for %s" % auth_user)
    sid = uuid.uuid4().hex
    session = {"created": datetime.datetime.utcnow(), "creator": auth_user}
    with slycat.web.server.database.couchdb.db_lock:
        clean_up_old_session(auth_user)
        database = slycat.web.server.database.couchdb.connect()
        
        database.save({"_id": sid, "type": "session", "created": str(session["created"].isoformat()), "creator": str(session["creator"]),
             'groups': groups, 'ip': remote_ip, "sessions": []})

    cherrypy.response.cookie["slycatauth"] = sid
    cherrypy.response.cookie["slycatauth"]["path"] = "/"
    if secure:
        cherrypy.response.cookie["slycatauth"]["secure"] = 1
        cherrypy.response.cookie["slycatauth"]["httponly"] = 1
    timeout = int(cherrypy.request.app.config["slycat"]["session-timeout"].total_seconds())
    cherrypy.response.cookie["slycatauth"]["Max-Age"] = timeout
    cherrypy.response.cookie["slycattimeout"] = "timeout"
    cherrypy.response.cookie["slycattimeout"]["path"] = "/"
    cherrypy.response.cookie["slycattimeout"]["Max-Age"] = timeout

    cherrypy.response.status = "200 OK"
    cherrypy.request.login = auth_user


def check_rules(groups):
    # cherrypy.log.error("%s@%s: Password check succeeded. checking for rules" % (user_name, remote_ip))
    # Successful authentication, now check access rules.
    authentication_kwargs = cherrypy.request.app.config["slycat-web-server"]["authentication"]["kwargs"]
    # for rules see slycat config file
    rules = []
    if "rules" in authentication_kwargs:
        rules = authentication_kwargs["rules"]
    if "realm" in authentication_kwargs:
        realm = authentication_kwargs["realm"]
    # cherrypy.log.error(("rules: %s args: %s" % (rules, authentication_kwargs)))

    if rules:
        # found rules now time to apply them
        # cherrypy.log.error("found rules::%s:: applying them to the user" % (rules))
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
                    # cherrypy.log.error("Authentication failed to confirm %s is in access directory." % user_name)
                    pass
            if deny:
                raise cherrypy.HTTPError("403 User denied by authentication rules.")


def check_https_get_remote_ip():
    """
    checks that the connection is https and then returns the users remote ip
    :return: remote ip
    """
    if not (cherrypy.request.scheme == "https" or cherrypy.request.headers.get("x-forwarded-proto") == "https"):
        cherrypy.log.error("slycat-standard-authentication.py authenticate",
                                "cherrypy.HTTPError 403 secure connection required.")
        raise cherrypy.HTTPError("403 Secure connection required.")
    return cherrypy.request.headers.get(
        "x-forwarded-for") if "x-forwarded-for" in cherrypy.request.headers else cherrypy.request.rem
