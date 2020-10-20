# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC. 
# Under the terms of Contract DE-NA0003525 with National Technology and Engineering 
# Solutions of Sandia, LLC, the U.S. Government retains certain rights in this software.

# This module supports interacting with the Slycat server from Python and the command line.

# parse arguments
import argparse
import os
import shlex

# authenticate to server
import getpass
import json
import requests
from requests_gssapi import HTTPSPNEGOAuth
import requests.exceptions as exceptions

# turn off warning for insecure connections
from requests.packages.urllib3.exceptions import InsecureRequestWarning
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

# encode/decode functions for string data (for http communication)
import base64

# handle arrays for Slycat requests
import numpy
import slycat.darray
import io

# miscellaneous utilities
import sys
import time

# set up logging
import logging
import cherrypy
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
    cherrypy.log.error("slycat.web.client.__init__.py", "Not a valid ranges object.")
    raise Exception("Not a valid ranges object.")

class ArgumentParser(argparse.ArgumentParser):
  """Return an instance of argparse.ArgumentParser, pre-configured with arguments to
  connect to a Slycat server."""

  def __init__(self, *arguments, **keywords):

    argparse.ArgumentParser.__init__(self, *arguments, **keywords)

    # arguments for connecting to Slycat server

    self.add_argument("--host", default="https://localhost", 
      help="Root URL of the Slycat server.  Default: '%(default)s'.")
    self.add_argument("--port", default=None, 
      help="Port of the Slycat server.")

    self.add_argument("--http-proxy", default="", 
      help="HTTP proxy URL.  Default: '%(default)s'.")
    self.add_argument("--https-proxy", default="", 
      help="HTTPS proxy URL.  Default: '%(default)s'.")
    self.add_argument("--verify", default=None, 
      help="Specify a certificate to use for HTTPS host certificate verification.")
    self.add_argument("--no-verify", default=False, action="store_true", 
      help="Disable HTTPS host certificate verification.")

    self.add_argument("--user", default=getpass.getuser(), 
      help="Slycat username.  Default: '%(default)s'")
    self.add_argument("--password", default=None, help="User password.")

    self.add_argument("--kerberos", default=False, action="store_true", 
      help="Use Kerberos authentication.  Default: %(default)s.")

    self.add_argument("--log-level", default="info", 
      choices=["debug", "info", "warning", "error", "critical"], 
      help="Log level.  Default: '%(default)s'.")

  def parse_args(self):

    if "SLYCAT" in os.environ:
      sys.argv += shlex.split(os.environ["SLYCAT"])

    # parse arguments
    arguments = argparse.ArgumentParser.parse_args(self)

    # log level
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

class Connection(object):
  """Encapsulates a set of requests to the given host.  Additional keyword
  arguments must be compatible with the Python Requests library,
  http://docs.python-requests.org/en/latest"""

  def __init__(self, host="https://localhost", port=None, kerberos=False, **keywords):
    
    # proxies default to ""
    proxies = keywords.get("proxies", {"http": "", "https": ""})

    # certificate verification is disabled unless specifically requested
    verify = True
    if keywords.get("verify") == "False":
      verify = False
    elif not keywords.get("verify"):
      verify = False

    # host and port
    self.host = host
    if port:
      self.host = host + ':' + port

    # using kerberos authentication?
    self.kerberos = kerberos

    # set up session
    self.keywords = keywords
    self.session = requests.Session()

    # check for Kerberos authentication
    if self.kerberos:

      # get Kerberos ticket granting ticket
      self.session.auth = HTTPSPNEGOAuth()

      # check that ticket is valid using list markings
      url = self.host + "/api/configuration/markings"
      response = self.session.get(url)

      if response.status_code == 401:
        cherrypy.log.error(
          "User %s is not Kerberos authenticated, try running 'kinit'." % 
          keywords.get("auth", ("",""))[0])
        sys.exit(1)

    else:

      # get user name and password, if supplied
      user_name, password = keywords.get("auth", ("",""))

      # if password not supplied, prompt user
      if not password:
        password = getpass.getpass("%s password: " % user_name)

      # encode as base 64
      user_name_b64 = base64.b64encode(user_name.encode("ascii"))
      password_b64 = base64.b64encode(password.encode("ascii"))

      # change back to ascii for JSON
      user_name_str = user_name_b64.decode('ascii')
      password_str = password_b64.decode('ascii')

      # authentication information
      data = {"user_name":user_name_str, "password":password_str}

      # login url
      url = host + "/login"

      # connect to server
      self.session.post(url, json=data, proxies=proxies, verify=verify)

      # session error, assume bad password
      if len(list(self.session.cookies.keys())) == 0:
        raise NameError('bad username or password:%s, for username:%s' % 
          (user_name, password))

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
      cherrypy.log.error("slycat.web.client.__init__.py request", "%s" % log_message)
      raise

  #######################################################################
  # Low-level functions that map directly to the underlying RESTful API #
  #######################################################################

  def delete_model(self, mid):
    """Delete an existing model.

    Parameters
    ----------
    mid: string, required
      The unique model identifier.

    See Also
    --------
    :http:delete:`/api/models/(mid)`
    """

    self.request("DELETE", "/api/models/%s" % (mid))

  def delete_project(self, pid):
    """Delete an existing project.

    Parameters
    ----------
    pid: string, required
      The unique project identifier.

    See Also
    --------
    :http:delete:`/api/projects/(pid)`
    """

    self.request("DELETE", "/api/projects/%s" % (pid))

  def delete_project_cache_object(self, pid, key):
    """Delete an existing project cache object.

    Parameters
    ----------
    pid: string, required
      The unique project identifier.
    key: string, required
      Unique cache object key.

    See Also
    --------
    :http:delete:`/api/projects/(pid)/cache/(key)`
    """

    self.request("DELETE", "/api/projects/%s/cache/%s" % (pid, key))

  def delete_reference(self, rid):
    """Delete an existing reference.

    Parameters
    ----------
    rid: string, required
      The unique reference identifier.

    See Also
    --------
    `/api/references/(rid)`
    """

    self.request("DELETE", "/references/%s" % (rid))

  def delete_remote(self, sid):
    """Delete an existing remote session.

    Parameters
    ----------
    sid: string, required
      The unique remote session identifier.

    See Also
    --------
    :http:delete:`/api/remotes/(hostname)`
    """

    self.request("DELETE", "/api/remotes/%s" % (sid))

  def get_bookmark(self, bid):
    """Retrieve an existing bookmark.

    Parameters
    ----------
    bid: string, required
      The unique bookmark identifier.

    Returns
    -------
    bookmark: object
      The bookmark object, which is an arbitrary collection of
      JSON-compatible data.

    See Also
    --------
    :http:get:`/api/bookmarks/(bid)`
    """

    return self.request("GET", "/bookmarks/%s" % (bid))

  def get_configuration_markings(self):
    """Retrieve marking information from the server.

    Returns
    -------
    markings: server marking information.

    See Also
    --------
    `/api/configuration/markings`
    """

    return self.request("GET", "/api/configuration/markings", 
      headers={"accept":"application/json"})

  def get_configuration_parsers(self):
    """Retrieve parser plugin information from the server.

    Returns
    -------
    parsers: server parser plugin information.

    See Also
    --------
    `/api/configuration/parsers`
    """

    return self.request("GET", "/api/configuration/parsers", 
      headers={"accept":"application/json"})

  def get_configuration_remote_hosts(self):
    """Retrieve remote host information from the server.

    Returns
    -------
    parsers: server remote host information.

    See Also
    --------
    `/api/configuration/remote-hosts`
    """

    return self.request("GET", "/api/configuration/remote-hosts", 
      headers={"accept":"application/json"})

  def get_configuration_support_email(self):
    """Retrieve support email information from the server.

    Returns
    -------
    parsers: server support email information.

    See Also
    --------
    `/api/configuration/support-email`
    """

    return self.request("GET", "/api/configuration/support-email", 
      headers={"accept":"application/json"})

  def get_configuration_version(self):
    """Retrieve version information from the server.

    Returns
    -------
    version: server version information.

    See Also
    --------
    `/api/configuration/version`
    """

    return self.request("GET", "/api/configuration/version",
      headers={"accept":"application/json"})

  def get_configuration_wizards(self):
    """Retrieve wizard plugin information from the server.

    Returns
    -------
    version: server wizard plugin information.

    See Also
    --------
    `/api/configuration/wizards`
    """

    return self.request("GET", "/api/configuration/wizards", 
      headers={"accept":"application/json"})

  def get_global_resource(self, resource):
    return self.request("GET", "/resources/global/%s" % resource)

  def get_model_resource(self, mtype, resource):
    return self.request("GET", "/resources/pages/%s/%s" % (mtype, resource))

  def get_wizard_resource(self, wtype, resource):
    return self.request("GET", "/resources/wizards/%s/%s" % (wtype, resource))

  def get_model(self, mid):
    """Retrieve an existing model.

    Parameters
    ----------
    mid: string, required
      The unique model identifier

    Returns
    -------
    model: object
      The model object, which is an arbitrary collection of
      JSON-compatible data.

    See Also
    --------
    :http:get:`/api/models/(mid)`
    """

    return self.request("GET", "/api/models/%s" % mid, 
      headers={"accept":"application/json"})

  def get_model_arrayset_metadata(self, mid, aid, arrays=None, statistics=None, unique=None):
    """Retrieve metadata describing an existing model arrayset artifact.

    Parameters
    ----------
    mid: string, required
      The unique model identifier.
    aid: string, required
      The unique artifact identifier.
    arrays: string, optional
      A set of arrays, specified using HQL.
    statistics: string, optional
      A set of attributes, specified using HQL.
    unique: string, optional
      A set of attributes, specified using HQL.

    Returns
    -------
    metadata: object
      The arrayset metadata, which is an arbitrary collection of
      JSON-compatible data.

    See Also
    --------
    :http:get:`/api/models/(mid)/arraysets/(aid)/metadata`
    """

    params = dict()
    if arrays is not None:
      params["arrays"] = arrays
    if statistics is not None:
      params["statistics"] = statistics
    if unique is not None:
      params["unique"] = unique
    return self.request("GET", "/api/models/%s/arraysets/%s/metadata" % 
      (mid, aid), params=params, headers={"accept":"application/json"})

  def get_model_file(self, mid, aid):
    return self.request("GET", "/api/models/%s/files/%s" % (mid, aid))

  def get_model_parameter(self, mid, aid):
    """Retrieve a model parameter artifact.

    Model parameters are JSON objects of arbitrary complexity.  They are stored directly within the model
    as part of its database record, so they should be limited in size (larger data should be stored using
    arraysets or files).

    Parameters
    ----------
    mid: string, required
      Unique model identifier.
    aid: string, required
      Unique (within the model) artifact id.

    Returns
    -------
    parameter: JSON-compatible object

    See Also
    --------
    :http:put:`/api/models/(mid)/parameters/(aid)`
    """

    return self.request("GET", "/api/models/%s/parameters/%s" % 
      (mid, aid), headers={"accept":"application/json"})

  def get_project_models(self, pid):
    """Returns every model in a project."""
    return self.request("GET", "/api/projects/%s/models" % pid, 
      headers={"accept":"application/json"})

  def get_project_references(self, pid):
    """Returns every reference in a project."""
    return self.request("GET", "/api/projects/%s/references" % pid, 
      headers={"accept":"application/json"})

  def get_project(self, pid):
    """Retrieve an existing project.

    Parameters
    ----------
    pid: string, required
      Unique project identifier.

    Returns
    -------
    project: Arbitrary collection of JSON-compatible data.

    See Also
    --------
    :http:get:`/api/projects/(pid)`
    """

    return self.request("GET", "/api/projects/%s" % pid, 
      headers={"accept":"application/json"})

  def get_project_cache_object(self, pid, key):
    """Retrieve an object from a project cache.

    Parameters
    ----------
    pid: string, required
      Unique project identifier.
    key: string, required
      Cache object identifier.

    Returns
    -------
    content: Cached object content.

    See Also
    --------
    :http:get:`/api/projects/(pid)/cache/(key)`
    """

    return self.request("GET", "/api/projects/%s/cache/%s" % (pid, key))

  def get_projects(self):
    """Retrieve all projects.

    Returns
    -------
    projects: List of projects.  Each project is an arbitrary collection of JSON-compatible data.

    See Also
    --------
    :http:get:`/api/projects`
    """

    return self.request("GET", "/api/projects_list", headers={"accept":"application/json"})

  def get_remote_file(self, sid, path, cache=None, project=None, key=None):
    """Retrieve a file using a remote session.

    Parameters
    ----------
    sid: string, required
      Unique remote session identifier.
    path: string, required
      Remote filesystem path (must be absolute).
    cache: string, optional
      Optional server-side cache for the retrieved file.  Must be `None` or "project".
    project: string, optional
      If `cache` is set to "project", this must specify a unique project identifier.
    key: string, optional
      if `cache` is set to "project", this must specify a unique key for the cached object.

    Returns
    -------
    file: Remote file contents.

    See Also
    --------
    :http:get:`/api/remotes/(hostname)/file(path)`
    """

    return self.request("GET", "/api/remotes/%s/file%s" % (sid, path), 
      params={"cache": cache, "project": project, "key": key})

  def get_remote_image(self, sid, path, cache=None, project=None, key=None):
    """Retrieve an image using a remote session.

    Parameters
    ----------
    sid: string, required
      Unique remote session identifier.
    path: string, required
      Remote filesystem path (must be absolute).
    cache: string, optional
      Optional server-side cache for the retrieved image.  Must be `None` or "project".
    project: string, optional
      If `cache` is set to "project", this must specify a unique project identifier.
    key: string, optional
      if `cache` is set to "project", this must specify a unique key for the cached object.

    Returns
    -------
    image: Remote image contents.

    See Also
    --------
    :http:get:`/api/remotes/(hostname)/image(path)`
    """

    return self.request("GET", "/api/remotes/%s/image%s" % (sid, path), 
      params={"cache": cache, "project": project, "key": key})

  def get_user(self, uid=None):
    """Retrieve directory information about an existing user.

    Parameters
    ----------
    uid: string, optional
      Unique user identifier.  If unspecified, returns information about the user making the call.

    Returns
    -------
    user: Arbitrary collection of JSON-compatible data.

    See Also
    --------
    :http:get:`/api/users/(uid)`
    """

    return self.request("GET", "/users/%s" % ("-" if uid is None else uid), 
      headers={"accept":"application/json"})

  def post_events(self, path, parameters={}):
    self.request("POST", "/events/%s" % path, params=parameters)

  def post_model_files(self, mid, aids, files, parser, input=True, parameters={}):
    """Stores model file artifacts."""

    data = parameters

    data.update({
      "input": json.dumps(input),
      "aids": aids,
      "parser": parser
    })

    files = [("files", ("blob", file)) for file in files]

    self.request("POST", "/api/models/%s/files" % mid, data=data, files=files)

  def post_model_finish(self, mid):
    """Notify the server that a model is fully initialized.

    When called, the server will perform one-time computation
    for the given model type.

    Parameters
    ----------
    mid: string, required
      Unique model identifier.

    See Also
    --------
    :http:post:`/api/models/(mid)/finish`
    """

    self.request("POST", "/api/models/%s/finish" % (mid))

  def post_project_bookmarks(self, pid, bookmark):
    """Store a bookmark.

    Parameters
    ----------
    pid: string, required
      Unique project identifier.
    bookmark: object
      Arbitrary collection of JSON-compatible data.

    Returns
    -------
    bid: string
      Unique bookmark identifier.

    See Also
    --------
    :http:post:`/api/projects/(pid)/bookmarks`
    """

    return self.request("POST", "/api/projects/%s/bookmarks" % (pid), 
      headers={"content-type":"application/json"}, data=json.dumps(bookmark))["id"]

  def post_project_models(self, pid, mtype, name, marking="", description=""):
    """Creates a new model, returning the model ID."""
    return self.request("POST", "/api/projects/%s/models" % (pid), 
      headers={"content-type":"application/json"}, data=json.dumps({"model-type":mtype, "name":name, "marking":marking, "description":description}))["id"]

  def post_project_references(self, pid, name, mtype=None, mid=None, bid=None):
    """Store a project reference.

    Parameters
    ----------
    pid: string, required
      Unique project identifier.
    name: string, required
      Reference name.
    mtype: string, optional
      Optional model type.
    mid: string, optional
      Optional model identifier.
    bid: string, optional
      Optional bookmark identifier.

    Returns
    -------
    rid: string
      Unique reference identifier.

    See Also
    --------
    `/api/projects/(pid)/references`
    """

    return self.request("POST", "/api/projects/%s/references" % (pid), 
      headers={"content-type":"application/json"}, data=json.dumps({"name":name, "model-type":mtype, "mid":mid, "bid":bid}))["id"]

  def post_projects(self, name, description=""):
    """Creates a new project, returning the project ID."""
    return self.request("POST", "/api/projects", 
      headers={"content-type":"application/json"}, 
      data=json.dumps({"name":name, "description":description}))["id"]

  def post_remotes(self, hostname, username, password, agent=None):
    return self.request("POST", "/api/remotes", 
    headers={"content-type":"application/json"}, 
    data=json.dumps({"hostname":hostname, "username":username, 
                     "password":password, "agent": agent}))["sid"]

  def post_remote_browse(self, sid, path, file_reject=None, file_allow=None, 
    directory_allow=None, directory_reject=None):
    body = {}
    if file_reject is not None:
      body["file-reject"] = file_reject
    if file_allow is not None:
      body["file-allow"] = file_allow
    if directory_reject is not None:
      body["directory-reject"] = directory_reject
    if directory_allow is not None:
      body["directory-allow"] = directory_allow

    return self.request("POST", "/api/remotes/" + sid + "/browse" + path, 
      headers={"content-type":"application/json"}, data=json.dumps(body))

  def put_model(self, mid, model):
    self.request("PUT", "/api/models/%s" % (mid), 
      headers={"content-type":"application/json"}, data=json.dumps(model))

  def put_model_arrayset_data(self, mid, aid, hyperchunks, data, force_json=False):
    """Write data to an arrayset artifact on the server.

    Parameters
    ----------
    mid: string, required
      Unique model identifier.
    aid: string, required
      Unique (to the model) arrayset artifact id.
    hyperchunks: string, required
      Specifies where the data will be stored, in :ref:`Hyperchunks` format.
    data: iterable, required)
      A collection of numpy.ndarray data chunks to be uploaded.  The number of
      data chunks must match the number implied by the `hyperchunks` parameter.
    force_json: bool, optional)
      Force the client to upload data using JSON instead of the binary format.

    See Also
    --------
    `/api/models/(mid)/arraysets/(aid)/data`
    """

    # Sanity check arguments
    if not isinstance(mid, str):
      cherrypy.log.error("slycat.web.client.__init__.py put_model_arrayset_data", 
        "Model id must be a string")
      raise ValueError("Model id must be a string.")
    if not isinstance(aid, str):
      cherrypy.log.error("slycat.web.client.__init__.py put_model_arrayset_data", 
        "Artifact id must be a string")
      raise ValueError("Artifact id must be a string.")
    if not isinstance(hyperchunks, str):
      cherrypy.log.error("slycat.web.client.__init__.py put_model_arrayset_data", 
        "Hyperchunks specification must be a string.")
      raise ValueError("Hyperchunks specification must be a string.")
    for chunk in data:
      if not isinstance(chunk, numpy.ndarray):
        cherrypy.log.error("slycat.web.client.__init__.py put_model_arrayset_data", 
          "Data chunk must be a numpy array.")
        raise ValueError("Data chunk must be a numpy array.")

    # Mark whether every data chunk is numeric ... if so, we can send the data in binary form.
    use_binary = numpy.all([chunk.dtype.char != "U" for chunk in data]) and not force_json

    # Build-up the request
    request_data = {}
    request_data["hyperchunks"] = hyperchunks
    if use_binary:
      request_data["byteorder"] = sys.byteorder

    if use_binary:

      # binary data
      request_buffer = io.BytesIO()
      for chunk in data:
        request_buffer.write(chunk.tostring(order="C"))
    else:

      # string data
      request_buffer = io.StringIO()
      request_buffer.write(json.dumps([chunk.tolist() for chunk in data]))

    # Send the request to the server ...
    self.request("PUT", "/api/models/%s/arraysets/%s/data" % (mid, aid), 
      data=request_data, files={"data":request_buffer.getvalue()})

  def put_model_arrayset_array(self, mid, aid, array, dimensions, attributes):
    """Starts a new array set array, ready to receive data."""

    stub = slycat.darray.Stub(dimensions, attributes)
    self.request("PUT", "/api/models/%s/arraysets/%s/arrays/%s" % (mid, aid, array), 
      headers={"content-type":"application/json"}, 
      data=json.dumps({"dimensions":stub.dimensions, "attributes":stub.attributes}))

  def put_model_arrayset(self, mid, aid, input=True):
    """Starts a new model array set artifact, ready to receive data."""

    self.request("PUT", "/api/models/%s/arraysets/%s" % (mid, aid), 
      headers={"content-type":"application/json"}, data=json.dumps({"input":input}))

  def put_model_inputs(self, source, target):
    self.request("PUT", "/api/models/%s/inputs" % (target), 
      headers={"content-type":"application/json"}, data=json.dumps({"sid":source}))

  def put_model_parameter(self, mid, aid, value, input=True):
    """Store a model parameter artifact.

    Model parameters are JSON objects of arbitrary complexity.  They are stored directly within the model
    as part of its database record, so they should be limited in size (larger data should be stored using
    arraysets or files).

    To get the value of a parameter artifact, use :func:`get_model` and read the value
    directly from the model record.  An artifact id `foo` will be accessible in the
    record as `model["artifact:foo"]`.

    Parameters
    ----------
    mid: string, required
      Unique model identifier.
    aid: string, required
      Unique (within the model) artifact id.
    value: object, required
      An arbitrary collection of JSON-compatible data.
    input: boolean, optional
      Marks whether this artifact is a model input.

    See Also
    --------
    :http:put:`/api/models/(mid)/parameters/(aid)`
    """

    self.request("PUT", "/api/models/%s/parameters/%s" % (mid, aid), 
      headers={"content-type":"application/json"}, data=json.dumps({"value":value, "input":input}))

  def put_project(self, pid, project):
    """Modifies a project."""
    return self.request("PUT", "/api/projects/%s" % pid, 
      headers={"content-type":"application/json"}, data=json.dumps(project))

  ##################################################################################
  # Convenience functions that layer additional functionality atop the RESTful API #
  ##################################################################################

  def find_project(self, name):
    """Return a project identified by name.

    Parameters
    ----------
    name: string, required
      The name of the project to return.

    Returns
    -------
    project: The matching project, which is an arbitrary collection of JSON-compatible data.

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
      cherrypy.log.error("slycat.web.client.__init__.py find_project", 
        "More than one project matched the given name.")
      raise Exception("More than one project matched the given name.")
    elif len(projects) == 1:
      return projects[0]
    else:
      cherrypy.log.error("slycat.web.client.__init__.py find_project", 
        "No project matched the given name.")
      raise Exception("No project matched the given name.")

  def find_or_create_project(self, name, description=""):
    """Return a project identified by name, or newly created.

    Parameters
    ----------
    name: string, required
      The name of the project to return (or create).
    description: string, optional
      Description to use for the new project (if a new project is created).

    Returns
    -------
    pid: string
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
      cherrypy.log.error("slycat.web.client.__init__.py find_or_create_project", 
        "More than one project matched the given name. Try using a different project name instead.")
      raise Exception("More than one project matched the given name. " +
        "Try using a different project name instead.")
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

    model = {key: value for key, value in list(kwargs.items()) if value is not None}
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
    mid: string, required
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
      model = self.request("GET", "/api/models/%s" % (mid), headers={"accept":"application/json"})
      if "state" in model and model["state"] not in ["waiting", "running"]:
        return
      time.sleep(1.0)

def connect(arguments, **keywords):
  """Factory function for client connections that takes an option parser as input."""

  # check for --no-verify or security certificate
  if arguments.no_verify:
    keywords["verify"] = False
  elif arguments.verify is not None:
    keywords["verify"] = arguments.verify

  return Connection(auth=(arguments.user, arguments.password),
    host=arguments.host, port=arguments.port, kerberos = arguments.kerberos,
    proxies={"http":arguments.http_proxy, "https":arguments.https_proxy}, **keywords)