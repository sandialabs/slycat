# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import argparse
import getpass
import json
import logging
import numbers
import numpy
import os
import requests
import shlex
import slycat.darray
import slycat.hyperslice
import sys
import time

try:
  import cStringIO as StringIO
except:
  import StringIO

log = logging.getLogger("slycat.web.client")
log.setLevel(logging.INFO)
log.addHandler(logging.StreamHandler())
log.handlers[0].setFormatter(logging.Formatter("%(levelname)s - %(message)s"))
log.propagate = False

def _require_array_ranges(ranges):
  """Validates a range object (hyperslice) for transmission to the server."""
  if ranges is None:
    return None
  elif isinstance(ranges, int):
    return [(0, ranges)]
  elif isinstance(ranges, tuple):
    return [ranges]
  elif isinstance(ranges, list):
    return ranges
  else:
    raise Exception("Not a valid ranges object.")

class ArgumentParser(argparse.ArgumentParser):
  """Return an instance of argparse.ArgumentParser, pre-configured with arguments to connect to a Slycat server."""
  def __init__(self, *arguments, **keywords):
    argparse.ArgumentParser.__init__(self, *arguments, **keywords)

    self.add_argument("--host", default="https://localhost", help="Root URL of the Slycat server.  Default: %(default)s")
    self.add_argument("--http-proxy", default="", help="HTTP proxy URL.  Default: %(default)s")
    self.add_argument("--https-proxy", default="", help="HTTPS proxy URL.  Default: %(default)s")
    self.add_argument("--list-markings", default=False, action="store_true", help="Display available marking types supported by the server.")
    self.add_argument("--log-level", default="info", choices=["debug", "info", "warning", "error", "critical"], help="Log level.  Default: %(default)s")
    self.add_argument("--no-verify", default=False, action="store_true", help="Disable HTTPS host certificate verification.")
    self.add_argument("--password", default=None)
    self.add_argument("--user", default=getpass.getuser(), help="Slycat username.  Default: %(default)s")
    self.add_argument("--verify", default=None, help="Specify a certificate to use for HTTPS host certificate verification.")

  def parse_args(self):
    if "SLYCAT" in os.environ:
      sys.argv += shlex.split(os.environ["SLYCAT"])

    arguments = argparse.ArgumentParser.parse_args(self)

    if arguments.list_markings:
      connection = connect(arguments)
      markings = connection.get_configuration_markings()
      type_width = numpy.max([len(marking["type"]) for marking in markings])
      label_width = numpy.max([len(marking["label"]) for marking in markings])
      print
      print "{:>{}} {:<{}}".format("Marking", type_width, "Description", label_width)
      print "{:>{}} {:<{}}".format("-" * type_width, type_width, "-" * label_width, label_width)
      for marking in markings:
        print "{:>{}} {:<{}}".format(marking["type"], type_width, marking["label"], label_width)
      print
      self.exit()

    if arguments.log_level == "debug":
      log.setLevel(logging.DEBUG)
    elif arguments.log_level == "info":
      log.setLevel(logging.INFO)
    elif arguments.log_level == "warning":
      log.setLevel(logging.WARNING)
    elif arguments.log_level == "error":
      log.setLevel(logging.ERROR)
    elif arguments.log_level == "critical":
      log.setLevel(logging.CRITICAL)

    return arguments

class option_parser(ArgumentParser):
  def __init__(self, *arguments, **keywords):
    ArgumentParser.__init__(self, *arguments, **keywords)
    log.warning("slycat.web.client.option_parser is deprecated, use slycat.web.client.ArgumentParser instead.")

class Connection(object):
  """Encapsulates a set of requests to the given host.  Additional keyword
  arguments must be compatible with the Python Requests library,
  http://docs.python-requests.org/en/latest"""
  def __init__(self, host="http://localhost:8092", **keywords):
    self.host = host
    self.keywords = keywords
    self.session = requests.Session()

  def request(self, method, path, **keywords):
    """Makes a request with the given HTTP method and path, returning the body of
    the response.  Additional keyword arguments must be compatible with the
    Python Requests library, http://docs.python-requests.org/en/latest"""

    # Combine per-request and per-connection keyword arguments ...
    keywords.update(self.keywords)

    # Combine host and path to produce the final request URI ...
    uri = self.host + path

    log_message = "{} {} {}".format(keywords.get("auth", ("", ""))[0], method, uri)

    try:
      response = self.session.request(method, uri, **keywords)

      log_message += " => {} {}".format(response.status_code, response.raw.reason)

      response.raise_for_status()

      body = None
      if response.headers["content-type"].startswith("application/json"):
        body = response.json()
      else:
        body = response.content

      log.debug(log_message)
      return body
    except:
      log.debug(log_message)
      raise

  ###########################################################################################################3
  # Low-level functions that map directly to the underlying RESTful API

  def delete_model(self, mid):
    """Delete an existing model.

    Parameters
    ----------
    mid : string, required
      The unique model identifier.

    See Also
    --------
    :http:delete:`/models/(mid)`
    """
    self.request("DELETE", "/models/%s" % (mid))

  def delete_project(self, pid):
    """Delete an existing project.

    Parameters
    ----------
    pid : string, required
      The unique project identifier.

    See Also
    --------
    :http:delete:`/projects/(pid)`
    """
    self.request("DELETE", "/projects/%s" % (pid))

  def get_bookmark(self, bid):
    """Retrieve an existing bookmark.

    Parameters
    ----------
    bid : string, required
      The unique bookmark identifier.

    Returns
    -------
    bookmark : object
      The bookmark object, which is an arbitrary collection of
      JSON-compatible data.

    See Also
    --------
    :http:get:`/bookmarks/(bid)`
    """
    return self.request("GET", "/bookmarks/%s" % (bid))

  def get_model(self, mid):
    """Retrieve an existing model.

    Parameters
    ----------
    mid : string, required
      The unique model identifier

    Returns
    -------
    model : object
      The model object, which is an arbitrary collection of
      JSON-compatible data.

    See Also
    --------
    :http:get:`/models/(mid)`
    """
    return self.request("GET", "/models/%s" % mid, headers={"accept":"application/json"})

  def get_model_array_attribute_chunk(self, mid, name, array, attribute, ranges, type=None):
    """Return a hyperslice from an array artifact attribute.

    Uses JSON to transfer the data unless the attribute type is specified.

    Parameters
    ----------
    mid : string, required
      Unique model identifier.
    name : string, required
      Arrayset artifact name.
    array : integer, required
      Zero-based array index.
    attribute : integer, required
      Zero-based attribute index.
    ranges : hyperslice, required.
      Range of values to retrieve along each dimension.
    type : numpy dtype, optional
      Output data type.

    Returns
    -------
    chunk : Python list, or numpy ndarray
    """
    ranges = _require_array_ranges(ranges)
    if ranges is None:
      raise Exception("An explicit chunk range is required.")
    if type is None or type == "string":
      return self.request("GET", "/models/%s/arraysets/%s/arrays/%s/attributes/%s/chunk?ranges=%s" % (mid, name, array, attribute, ",".join([str(item) for range in ranges for item in range])), headers={"accept":"application/json"})
    else:
      shape = tuple([end - begin for begin, end in ranges])
      content = self.request("GET", "/models/%s/arraysets/%s/arrays/%s/attributes/%s/chunk?ranges=%s&byteorder=%s" % (mid, name, array, attribute, ",".join([str(item) for range in ranges for item in range]), sys.byteorder), headers={"accept":"application/octet-stream"})
      return numpy.fromstring(content, dtype=type).reshape(shape)

  def get_model_file(self, mid, name):
    return self.request("GET", "/models/%s/files/%s" % (mid, name))

  def get_model_parameter(self, mid, name):
    """Retrieve a model parameter artifact.

    Model parameters are JSON objects of arbitrary complexity.  They are stored directly within the model
    as part of its database record, so they should be limited in size (larger data should be stored using
    arraysets or files).

    Parameters
    ----------
    mid : string, required
      Unique model identifier.
    name : string, required
      Unique (within the model) artifact name.

    Returns
    -------
    parameter : JSON-compatible object

    See Also
    --------
    :http:put:`/models/(mid)/parameters/(name)`
    """
    return self.request("GET", "/models/%s/parameters/%s" % (mid, name), headers={"accept":"application/json"})

  def get_model_table_chunk(self, mid, name, array, rows, columns):
    """Returns a chunk (set of rows and columns) from a table (array) artifact."""
    return self.request("GET", "/models/%s/tables/%s/arrays/%s/chunk?rows=%s&columns=%s" % (mid, name, array, ",".join([str(row) for row in rows]), ",".join([str(column) for column in columns])), headers={"accept":"application/json"})

  def get_model_table_metadata(self, mid, name, array):
    """Returns the metadata for a table (array) artifact."""
    return self.request("GET", "/models/%s/tables/%s/arrays/%s/metadata" % (mid, name, array), headers={"accept":"application/json"})

  def get_model_table_sorted_indices(self, mid, name, array, rows, index=None, sort=None):
    content = self.request("GET", "/models/%s/tables/%s/arrays/%s/sorted-indices?rows=%s%s%s&byteorder=%s" % (mid, name, array, ",".join([str(row) for row in rows]), "&index=%s" % index if index is not None else "", "&sort=%s" % ",".join(["%s:%s" % (column, order) for column, order in sort]) if sort is not None else "", sys.byteorder))
    return numpy.fromstring(content, dtype="int32")

  def get_model_table_unsorted_indices(self, mid, name, array, rows, index=None, sort=None):
    content = self.request("GET", "/models/%s/tables/%s/arrays/%s/unsorted-indices?rows=%s%s%s&byteorder=%s" % (mid, name, array, ",".join([str(row) for row in rows]), "&index=%s" % index if index is not None else "", "&sort=%s" % ",".join(["%s:%s" % (column, order) for column, order in sort]) if sort is not None else "", sys.byteorder))
    return numpy.fromstring(content, dtype="int32")

  def get_project_models(self, pid):
    """Returns every model in a project."""
    return self.request("GET", "/projects/%s/models" % pid, headers={"accept":"application/json"})

  def get_project(self, pid):
    """Retrieve an existing project.

    Parameters
    ----------
    pid : string, required
      Unique project identifier.

    Returns
    -------
    project : Arbitrary collection of JSON-compatible data.

    See Also
    --------
    :http:get:`/projects/(pid)`
    """
    return self.request("GET", "/projects/%s" % pid, headers={"accept":"application/json"})

  def get_projects(self):
    """Retrieve all projects.

    Returns
    -------
    projects : List of projects.  Each project is an arbitrary collection of JSON-compatible data.

    See Also
    --------
    :http:get:`/projects`
    """
    return self.request("GET", "/projects", headers={"accept":"application/json"})

  def get_user(self, uid):
    """Retrieve directory information about an existing user.

    Parameters
    ----------
    uid : string, required
      Unique user identifier.

    Returns
    -------
    user : Arbitrary collection of JSON-compatible data.

    See Also
    --------
    :http:get:`/users/(uid)`
    """
    return self.request("GET", "/users/%s" % uid, headers={"accept":"application/json"})

  def get_configuration_markings(self):
    """Retrieve marking information from the server.

    Returns
    -------
    markings : server marking information.

    See Also
    --------
    :http:get:`/configuration/markings`
    """
    return self.request("GET", "/configuration/markings", headers={"accept":"application/json"})

  def get_configuration_version(self):
    """Retrieve version information from the server.

    Returns
    -------
    version : server version information.

    See Also
    --------
    :http:get:`/configuration/version`
    """
    return self.request("GET", "/configuration/version", headers={"accept":"application/json"})

  def get_ticket(self):
    """Retrieve an authentication from the server.

    Returns
    -------
    tid : ticket id.

    See Also
    --------
    :http:get:`/tickets`
    """
    return self.request("GET", "/tickets", headers={"accept":"application/json"})["id"]

  def post_model_finish(self, mid):
    """Notify the server that a model is fully initialized.

    When called, the server will perform one-time computation
    for the given model type.

    Parameters
    ----------
    mid : string, required
      Unique model identifier.

    See Also
    --------
    :http:post:`/models/(mid)/finish`
    """
    self.request("POST", "/models/%s/finish" % (mid))

  def post_project_bookmarks(self, pid, bookmark):
    """Store a bookmark.

    Parameters
    ----------
    pid : string, required
      Unique project identifier.
    bookmark : object
      Arbitrary collection of JSON-compatible data.

    Returns
    -------
    bid : string
      Unique bookmark identifier.

    See Also
    --------
    :http:post:`/projects/(pid)/bookmarks`
    """
    return self.request("POST", "/projects/%s/bookmarks" % (pid), headers={"content-type":"application/json"}, data=json.dumps(bookmark))["id"]

  def post_project_models(self, pid, type, name, marking="", description=""):
    """Creates a new model, returning the model ID."""
    return self.request("POST", "/projects/%s/models" % (pid), headers={"content-type":"application/json"}, data=json.dumps({"model-type":type, "name":name, "marking":marking, "description":description}))["id"]

  def post_projects(self, name, description=""):
    """Creates a new project, returning the project ID."""
    return self.request("POST", "/projects", headers={"content-type":"application/json"}, data=json.dumps({"name":name, "description":description}))["id"]

  def post_remotes(self, hostname, username, password):
    return self.request("POST", "/remotes", headers={"content-type":"application/json"}, data=json.dumps({"hostname":hostname, "username":username, "password":password}))["sid"]

  def post_remote_browse(self, sid, path, file_reject=None, file_allow=None, directory_allow=None, directory_reject=None):
    body = {}
    if file_reject is not None:
      body["file-reject"] = file_reject
    if file_allow is not None:
      body["file-allow"] = file_allow
    if directory_reject is not None:
      body["directory-reject"] = directory_reject
    if directory_allow is not None:
      body["directory-allow"] = directory_allow
    return self.request("POST", "/remotes/" + sid + "/browse" + path, headers={"content-type":"application/json"}, data=json.dumps(body))

  def put_model(self, mid, model):
    self.request("PUT", "/models/%s" % (mid), headers={"content-type":"application/json"}, data=json.dumps(model))

  def put_model_arrayset_data(self, mid, name, hyperchunks, force_json=False):
    """Sends array data to the server."""
    # Sanity check arguments
    if isinstance(hyperchunks, tuple):
      hyperchunks = [hyperchunks]
    hyperchunks = [(array, attribute, hyperslices if isinstance(hyperslices, list) else [hyperslices], data if isinstance(data, list) else [data]) for array, attribute, hyperslices, data in hyperchunks]

    for array, attribute, hyperslices, data in hyperchunks:
      if not isinstance(array, numbers.Integral) or array < 0:
        raise ValueError("Array index must be a non-negative integer.")
      if not isinstance(attribute, numbers.Integral) or attribute < 0:
        raise ValueError("Attribute index must be a non-negative integer.")
      for hyperslice in hyperslices:
        slycat.hyperslice.validate(hyperslice)
      for chunk in data:
        if not isinstance(chunk, numpy.ndarray):
          raise ValueError("Data chunk must be a numpy array.")
      if len(hyperslices) != len(data):
        raise ValueError("Hyperslice and data counts must match.")

    # Mark whether every data chunk is numeric ... if so, we can send the data in binary form.
    use_binary = numpy.all([chunk.dtype.char != "S" for chunk in data for array, attribute, hyperslices, data in hyperchunks]) and not force_json

    # Build-up the request
    request_data = {}
    request_data["hyperchunks"] = ";".join(["%s/%s/%s" % (array, attribute, "|".join([slycat.hyperslice.format(hyperslice) for hyperslice in hyperslices])) for array, attribute, hyperslices, data in hyperchunks])
    if use_binary:
      request_data["byteorder"] = sys.byteorder

    request_buffer = StringIO.StringIO()
    for array, attribute, hyperslices, data in hyperchunks:
      if use_binary:
        for chunk in data:
          request_buffer.write(chunk.tostring(order="C"))
      else:
        request_buffer.write(json.dumps([chunk.tolist() for chunk in data]))

    # Send the request to the server ...
    self.request("PUT", "/models/%s/arraysets/%s/data" % (mid, name), data=request_data, files={"data":request_buffer.getvalue()})

  def put_model_arrayset_array(self, mid, name, array, dimensions, attributes):
    """Starts a new array set array, ready to receive data."""
    stub = slycat.darray.Stub(dimensions, attributes)
    self.request("PUT", "/models/%s/arraysets/%s/arrays/%s" % (mid, name, array), headers={"content-type":"application/json"}, data=json.dumps({"dimensions":stub.dimensions, "attributes":stub.attributes}))

  def put_model_arrayset(self, mid, name, input=True):
    """Starts a new model array set artifact, ready to receive data."""
    self.request("PUT", "/models/%s/arraysets/%s" % (mid, name), headers={"content-type":"application/json"}, data=json.dumps({"input":input}))

  def put_model_file(self, mid, name, data, content_type, input=True):
    """Stores a model file artifact."""
    self.request("PUT", "/models/%s/files/%s" % (mid, name), data=({"input":json.dumps(input)}), files={"file":("file", data, content_type)})

  def put_model_inputs(self, source, target):
    self.request("PUT", "/models/%s/inputs" % (target), headers={"content-type":"application/json"}, data=json.dumps({"sid":source}))

  def put_model_parameter(self, mid, name, value, input=True):
    """Store a model parameter artifact.

    Model parameters are JSON objects of arbitrary complexity.  They are stored directly within the model
    as part of its database record, so they should be limited in size (larger data should be stored using
    arraysets or files).

    To get the value of a parameter artifact, use :func:`get_model` and read the value
    directly from the model record.  An artifact named `foo` will be accessible in the
    record as `model["artifact:foo"]`.

    Parameters
    ----------
    mid : string, required
      Unique model identifier.
    name : string, required
      Unique (within the model) artifact name.
    value : object, required
      An arbitrary collection of JSON-compatible data.
    input : boolean, optional
      Marks whether this artifact is a model input.

    See Also
    --------
    :http:put:`/models/(mid)/parameters/(name)`
    """
    self.request("PUT", "/models/%s/parameters/%s" % (mid, name), headers={"content-type":"application/json"}, data=json.dumps({"value":value, "input":input}))

  def put_project(self, pid, project):
    """Modifies a project."""
    return self.request("PUT", "/projects/%s" % pid, headers={"content-type":"application/json"}, data=json.dumps(project))

  ###########################################################################################################
  # Convenience functions that layer additional functionality atop the RESTful API

  def find_project(self, name):
    """Return a project identified by name.

    Parameters
    ----------
    name : string, required
      The name of the project to return.

    Returns
    -------
    project : The matching project, which is an arbitrary collection of JSON-compatible data.

    Raises
    ------
    Exception
      If a project with a matching name can't be found, or more than one project matches the name.

    See Also
    --------
    :func:`find_or_create_project`, :func:`get_projects`
    """
    projects = [project for project in self.get_projects()["projects"] if project["name"] == name]

    if len(projects) > 1:
      raise Exception("More than one project matched the given name.")
    elif len(projects) == 1:
      return projects[0]
    else:
      raise Exception("No project matched the given name.")

  def find_or_create_project(self, name, description=""):
    """Return a project identified by name, or newly created.

    Parameters
    ----------
    name : string, required
      The name of the project to return (or create).
    description: string, optional
      Description to use for the new project (if a new project is created).

    Returns
    -------
    pid : string
      Unique identifier of the matching (or newly created) project.

    Raises
    ------
    Exception
      If more than one project matches the given name.

    See Also
    --------
    :func:`post_projects`
    """
    projects = [project for project in self.get_projects()["projects"] if project["name"] == name]

    if len(projects) > 1:
      raise Exception("More than one project matched the given name.  Try using a different project name instead.")
    elif len(projects) == 1:
      return projects[0]["_id"]
    else:
      return self.post_projects(name, description)

  def update_model(self, mid, **kwargs):
    """Update model state.

    This function provides a more convenient alternative to :func:`put_model`.

    See Also
    --------
    :func:`put_model`
    """
    model = {key : value for key, value in kwargs.items() if value is not None}
    self.put_model(mid, model)

  def join_model(self, mid):
    """Wait for a model to complete before returning.

    A Slycat model goes through several distinct phases over its lifetime:

    1. The model is created.
    2. Input artifacts are pushed into the model.
    3. The model is marked "finished".
    4. Optional one-time computation is performed on the server, storing output artifacts.
    5. The model is complete and ready to be viewed.

    Use this function in scripts that have performed steps 1, 2, and 3 and need to wait until
    step 4 completes.

    Parameters
    ----------
    mid : string, required
      Unique model identifier.

    Notes
    -----
    A model that hasn't been finished will never complete - you should
    ensure that post_model_finish() is called successfully before calling
    join_model().

    See Also
    --------
    :func:`post_model_finish`
    """
    while True:
      model = self.request("GET", "/models/%s" % (mid), headers={"accept":"application/json"})
      if "state" in model and model["state"] not in ["waiting", "running"]:
        return
      time.sleep(1.0)

def connect(arguments, **keywords):
  """Factory function for client connections that takes an option parser as input."""
  if arguments.no_verify:
    keywords["verify"] = False
  elif arguments.verify is not None:
    keywords["verify"] = arguments.verify
  return Connection(auth=(arguments.user, arguments.password if arguments.password is not None else getpass.getpass("%s password: " % arguments.user)), host=arguments.host, proxies={"http":arguments.http_proxy, "https":arguments.https_proxy}, **keywords)

