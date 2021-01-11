# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC. 
# Under the terms of Contract DE-NA0003525 with National Technology and Engineering 
# Solutions of Sandia, LLC, the U.S. Government retains certain rights in this software.

# This module supports interacting with the Slycat server from Python and the command line.

# standard libraries

# parse arguments
import argparse
import os
import shlex

# authenticate to server
import getpass
import json

# encode/decode functions for string data (for http communication)
import base64

# miscellaneous utilities
import sys
import time
import math

# stream to server
import io

# logging
import logging

# 3rd party libraries

# http requests & kerberos
import requests
import requests.exceptions as exceptions
from requests_kerberos import HTTPKerberosAuth, OPTIONAL
from requests_kerberos.exceptions import KerberosExchangeError

# turn off warning for insecure connections
from requests.packages.urllib3.exceptions import InsecureRequestWarning
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

# handle arrays for Slycat requests
import numpy

# web server interaction
import cherrypy

# local libraries

# handle arrays for Slycat requests
import slycat.darray

# set up logging
log = logging.getLogger("slycat.web.client")
log.setLevel(logging.INFO)
log.addHandler(logging.StreamHandler())
log.handlers[0].setFormatter(logging.Formatter("%(levelname)s - %(message)s"))
log.propagate = False

# default file slice size (10 MB)
FILE_SLICE_DEFAULT = 10_000_000

# default Slycat server
HOST_DEFAULT = "https://localhost"

# private function (denoted by _name)
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

# print iterations progress bar -- from stack overflow
# https://stackoverflow.com/questions/3173320/text-progress-bar-in-the-console
def _print_progress_bar (iteration, total, prefix = '', suffix = '', 
  decimals = 1, length = 100, fill = '█', printEnd = "\r"):
    
    # Call in a loop to create terminal progress bar
    # @params:
    #     iteration   - Required  : current iteration (Int)
    #     total       - Required  : total iterations (Int)
    #     prefix      - Optional  : prefix string (Str)
    #     suffix      - Optional  : suffix string (Str)
    #     decimals    - Optional  : positive number of decimals in percent complete (Int)
    #     length      - Optional  : character length of bar (Int)
    #     fill        - Optional  : bar fill character (Str)
    #     printEnd    - Optional  : end character (e.g. "\r", "\r\n") (Str)
    
    percent = ("{0:." + str(decimals) + "f}").format(100 * (iteration / float(total)))
    filledLength = int(length * iteration // total)
    bar = fill * filledLength + '-' * (length - filledLength)
    print(f'\r{prefix} |{bar}| {percent}% {suffix}', end = printEnd)

    # print new line on complete
    if iteration == total: 
        print()

class ArgumentParser(argparse.ArgumentParser):
  """Return an instance of argparse.ArgumentParser, pre-configured with arguments to
  connect to a Slycat server.

  Pre-configured options are: 

    * **-\\-host** -- the URL of the Slycat server.
    * **-\\-port** -- the port of the Slycat server.
    * **-\\-http-proxy** -- the URL for an http proxy.
    * **-\\-https-proxy** -- the URL for an https proxy.
    * **-\\-verify** -- an SSL certificate to verify https host.
    * **-\\-no-verify** -- disable https verification.
    * **-\\-file-slice-size** -- maximum number of bytes to upload at once.
    * **-\\-user** -- user name.
    * **-\\-passowrd** -- user password.
    * **-\\-kerberos** -- enable kerberos authentication.
    * **-\\-log-level** -- log detail to display.
  """

  def __init__(self, *arguments, **keywords):

    argparse.ArgumentParser.__init__(self, *arguments, **keywords)

    # arguments for connecting to Slycat server

    self.add_argument("--host", default=HOST_DEFAULT, 
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

    self.add_argument('--file-slice-size', default=FILE_SLICE_DEFAULT, type=int,
      help="Maximum number of bytes to upload before slicing files (i.e. before "
           "uploading in chunks).  Default: %(default)s.")

    self.add_argument("--user", default=getpass.getuser(), 
      help="Slycat username.  Default: '%(default)s'")
    self.add_argument("--password", default=None, help="User password.")

    self.add_argument("--kerberos", default=False, action="store_true", 
      help="Use Kerberos authentication.  Default: %(default)s.")

    self.add_argument("--log-level", default="info", 
      choices=["debug", "info", "warning", "error", "critical"], 
      help="Log level.  Default: '%(default)s'.")

  def parse_args(self, list_input=None):
    """Overrides argparse parse_args command.  Parses slycat.web.client arguments
    in addition to any arguments added by users of the class.  Can also be used to
    parse a list of arguments passed from a Python function, such as
    
    >>> parser = slycat.web.client.ArgumentParser()
    >>> parser.parse_args(["--host", "slycat.sandia.gov", "--kerberos"]).
    """

    if "SLYCAT" in os.environ:
      sys.argv += shlex.split(os.environ["SLYCAT"])

    # parse arguments
    arguments = argparse.ArgumentParser.parse_args(self, list_input)

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
  """Provides a class to facilitate communication with the Slycat web server.  
  To use, open a connection and submit requests.  For example:

  >>> parser = slycat.web.client.ArgumentParser()
  >>> arguments = parser.parse_args()
  >>> connection = slycat.web.client.connect(arguments)
  >>> projects = connection.get_projects()
  """

  def __init__(self, host=HOST_DEFAULT, port=None, kerberos=False,
               file_slice_size=FILE_SLICE_DEFAULT, **keywords):
    
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

    # set up max file slice size
    self.file_slice_size = file_slice_size

    # check for Kerberos authentication
    if self.kerberos:

      # get Kerberos ticket granting ticket
      self.session.auth = HTTPKerberosAuth(mutual_authentication=OPTIONAL,
                                           force_preemptive=True)

      # check that ticket is valid using list markings
      url = self.host + "/api/configuration/markings"
      try:
        response = self.session.get(url, proxies=proxies, verify=verify,
                                    auth=self.session.auth)

      except KerberosExchangeError:
        cherrypy.log.error("Could not find Kerberos ticket, try running 'kinit'.")
        sys.exit(1)

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
      url = self.host + "/api/login"

      # connect to server
      self.session.post(url, json=data, proxies=proxies, verify=verify)

      # session error, assume bad password
      if len(list(self.session.cookies.keys())) == 0:
        raise NameError('bad username or password:%s, for username:%s' % 
          (user_name, password))

  def request(self, method, path, **keywords):
    """Basic request to Slycat server using open session.  To make a request 
    provide the HTTP method and path, and this method will return the body of
    the response.  Additional keyword arguments must be compatible with the
    Python requests library.
    
    Parameters
    ----------
    method: string, required
      The HTTP method to use, e.g. "GET", "PUT", etc.
    path: string, required
      The extension to the URL for the Slycat server, e.g. "/api/models/(mid)".

    Returns
    -------
    response: the body of the Server response.
    """

    # combine per-request and per-connection keyword arguments
    keywords.update(self.keywords)
    
    # combine host and path to produce the final request URI
    uri = self.host + path
    
    # create log message for this request
    log_message = "{} {} {}".format(keywords.get("auth", ("", ""))[0], method, uri)

    # send request
    try:
      response = self.session.request(method, uri, **keywords)

      # add response to log message
      log_message += " => {} {}".format(response.status_code, response.raw.reason)

      # check to see if an error occured
      response.raise_for_status()

      # parse and return body of response
      body = None
      if response.headers["content-type"].startswith("application/json"):
        body = response.json()
      else:
        body = response.content

      # show request in debug log
      log.debug(log_message)

      return body

    # log any errors to both slycat.web.client and cherrypy
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
    :http:delete:`/api/references/(rid)`
    """

    self.request("DELETE", "/api/references/%s" % (rid))

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

    return self.request("GET", "/api/bookmarks/%s" % (bid))

  def get_configuration_markings(self):
    """Retrieve marking information from the server.

    Returns
    -------
    markings: server marking information.

    See Also
    --------
    :http:get:`/api/configuration/markings`
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
    :http:get:`/api/configuration/parsers`
    """

    return self.request("GET", "/api/configuration/parsers", 
      headers={"accept":"application/json"})

  def get_configuration_remote_hosts(self):
    """Retrieve remote host information from the server.

    Returns
    -------
    remote_hosts: server remote host information.

    See Also
    --------
    :http:get:`/api/configuration/remote-hosts`
    """

    return self.request("GET", "/api/configuration/remote-hosts", 
      headers={"accept":"application/json"})

  def get_configuration_support_email(self):
    """Retrieve support email information from the server.

    Returns
    -------
    email: server support email information.

    See Also
    --------
    :http:get:`/api/configuration/support-email`
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
    :http:get:`/api/configuration/version`
    """

    return self.request("GET", "/api/configuration/version",
      headers={"accept":"application/json"})

  def get_configuration_wizards(self):
    """Retrieve wizard plugin information from the server.

    Returns
    -------
    wizards: server wizard plugin information.

    See Also
    --------
    :http:get:`/api/configuration/wizards`
    """

    return self.request("GET", "/api/configuration/wizards", 
      headers={"accept":"application/json"})

  # the following three calls seem to be defunct

  # def get_global_resource(self, resource):
  #   return self.request("GET", "/resources/global/%s" % resource)

  # def get_model_resource(self, mtype, resource):
  #   return self.request("GET", "/resources/pages/%s/%s" % (mtype, resource))

  # def get_wizard_resource(self, wtype, resource):
  #   return self.request("GET", "/resources/wizards/%s/%s" % (wtype, resource))

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
    """Retrieves the file corresponding to a given model and artifacts.

    Parameters
    ----------
    mid: string, required
      Unique model identifier.
    aid: string, required
      Unique (with the model) artifact id.

    Returns
    -------
    file: File data corresponding to artifact.

    See Also
    --------
    :http:get:`/api/models/(mid)/files/(aid)`
    """

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
    parameter: JSON-compatible object.

    See Also
    --------
    :http:put:`/api/models/(mid)/parameters/(aid)`
    """

    return self.request("GET", "/api/models/%s/parameters/%s" % 
      (mid, aid), headers={"accept":"application/json"})

  def get_project_models(self, pid):
    """Retrieve every model in a oroject.

    Parameters
    ----------
    pid: string, required
      Unique project identifier.

    Returns
    -------
    models: JSON-compatible object.

    See Also
    --------
    :http:get:`/api/projects/(pid)/models`
    """

    return self.request("GET", "/api/projects/%s/models" % pid, 
      headers={"accept":"application/json"})

  def get_project_references(self, pid):
    """Returns every reference in a project.
    
    Parameters
    ----------
    pid: string, required
      Unique project identifier.

    Returns
    -------
    references: JSON-compatible object.

    See Also
    --------
    :http:get:`/api/projects/(pid)/references`
    """
    
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

    return self.request("GET", "/api/users/%s" % ("-" if uid is None else uid), 
      headers={"accept":"application/json"})

  def post_events(self, path, parameters={}):
    """Post event to be logged on Slycat server.

    Parameters
    ----------
    path: string, required
      Path-like URI describing event to be logged.
    parameters: dictionary, optional
      JSON type object describing event.

    See Also
    --------
    :http:post:`/api/events/(event)`
    """

    self.request("POST", "/api/events/%s" % path, params=parameters)

  def post_model_files(self, mid, aids, files, parser, input=True, parameters={}):
    """Stores model file artifacts.
    
    Parameters
    ----------
    mid: string, required
      Unique model identifier.
    aids: array, required
      Artifact IDs for model storage.
    files: array, required
      Local files for upload.
    parser: string, required
      Name of Slycat parser that will process the files.
    input: boolean, optional
      Set as true (default) to store as model artifacts.
    parametrs: dictionary, optional
      Additional data to pass to parser.

    See Also
    --------
    :http:post:`/api/models/(mid)/files`
    """

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
    """Creates a new model, returning the model ID.
    
    Parameters
    ----------
    pid: string, required
      Unique project identifier.
    mtype: string, required
      Model type.
    name: string, required
      Model name.
    marking: string, optional
      Model marking.
    description: string, optional
      Description of model.

    Returns
    -------
    mid: string
      New model identifier.

    See Also
    --------
    :http:post:`/api/projects/(pid)/models`
    """

    return self.request("POST", "/api/projects/%s/models" % (pid), 
      headers={"content-type":"application/json"}, 
      data=json.dumps({"model-type":mtype, "name":name, "marking":marking, 
        "description":description}))["id"]

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
    :http:post:`/api/projects/(pid)/references`
    """

    return self.request("POST", "/api/projects/%s/references" % (pid), 
      headers={"content-type":"application/json"}, data=json.dumps({"name":name, "model-type":mtype, "mid":mid, "bid":bid}))["id"]

  def post_projects(self, name, description=""):
    """Creates a new project, returning the project ID.
    
    Parameters
    ----------
    name: string, required
      Name of project to be created.
    description: string, optional
      Description of new project.

    Returns
    -------
    pid: string
      Unique project identifier.

    See Also
    --------
    :http:post:`/api/projects`
    """
    return self.request("POST", "/api/projects", 
      headers={"content-type":"application/json"}, 
      data=json.dumps({"name":name, "description":description}))["id"]

  def post_remotes(self, hostname, username, password, agent=None):
    """Creates a new remote connection from the Slycat server to another host. 

    Parameters
    ----------
    hostname: string, required
      Name of remote host.
    username: string, required
      User name for connection.
    password: string, required
      Password to authenticate connection.
    agent: boolean, optional
      Create an agent upon establishing connection.
    
    Returns
    -------
    sid: string
      Session ID for connection.

    See Also
    --------
    :http:post:`/api/remotes`
    """
    return self.request("POST", "/api/remotes", 
      headers={"content-type":"application/json"}, 
      data=json.dumps({"hostname":hostname, "username":username, 
                       "password":password, "agent": agent}))["sid"]

  def post_remote_browse(self, sid, path, file_reject=None, file_allow=None, 
                         directory_allow=None, directory_reject=None):
    """Uses an existing remote session to retrieve remote filesystem information.

    Parameters
    ----------
    sid: string, required
      Session ID for connection.
    path: string, required
      Remote file system path (must be absolute).
    file_reject: string, optional
      Regular expression for rejecting files.
    file_allow: string, optional
      Regular expression for retaining files.
    directory_reject: string, optional
      Regular expression for rejecting directories.
    directory_allow: string, optional
      Regular expression for retaining directories.

    Returns
    -------
    response_body: JSON like object.

    See Also
    --------
    :http:post:`/api/remotes/(hostname)/browse(path)`
    """

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
    """Modify a Slycat model.

    Parameters
    ----------
    mid: string, required
      Model identifier.
    model: dictionary, required
      JSON like dictionary with fields to modified model including:

        * name (*string, optional*)
        * description (*string, optional*)
        * state (*string, optional*)
        * progress (*float, optional*)
        * message (*string, optional*)

    See Also
    --------
    :http:put:`/api/models/(mid)`
    """
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
    :http:put:`/api/models/(mid)/arraysets/(aid)/data`
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
    """Starts a new array set array, ready to receive data.
    
    Parameters
    ----------
    mid: string, required
      Unique model identifier.
    aid: string, required
      Unique artifact identifier.
    array: int, required
      Unique array index.
    dimensions: array, required
      Array dimensions.
    attributes: array, required
      Array attributes (data types).

    See Also
    --------
    :http:put:`/api/models/(mid)/arraysets/(aid)/arrays/(array)`
    """

    stub = slycat.darray.Stub(dimensions, attributes)
    self.request("PUT", "/api/models/%s/arraysets/%s/arrays/%s" % (mid, aid, array), 
      headers={"content-type":"application/json"}, 
      data=json.dumps({"dimensions":stub.dimensions, "attributes":stub.attributes}))

  def put_model_arrayset(self, mid, aid, input=True):
    """Starts a new model array set artifact, ready to receive data.
    
    Parameters
    ----------
    mid: string, required
      Unique model identifier.
    aid: string, required
      Unique artifact identifier.
    input: boolean, optional
      Set to true (default) if array set is a model input.

    See Also
    --------
    :http:put:`/api/models/(mid)/arraysets/(aid)`
    """

    self.request("PUT", "/api/models/%s/arraysets/%s" % (mid, aid), 
      headers={"content-type":"application/json"}, data=json.dumps({"input":input}))

  def put_model_inputs(self, source, target):
    """Copies the input artifacts from one model to another. Both models 
    must be part of the same project. By default, array artifacts are copied 
    by reference instead of value for efficiency.

    Parameters
    ----------
    source: string, required
      Model ID source of artifacts.
    target: string, required
      Model ID target for artifacts.

    See Also
    --------
    :http:put:`/api/models/(mid)/inputs`
    """

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
    """Modifies a project.
    
    Parameters
    ----------
    pid: string, required
      Unique project identifier.
    project: dictionary, required
      JSON like dictionary with fields to modified model including:

        * name (*string, optional*)
        * description (*string, optional*)
        * acl (*string, optional*) -- access control list

    See Also
    --------
    :http:put:`/api/projects/(pid)`
    """
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

    projects = [project for project in self.get_projects()["projects"] 
                if project["name"] == name]

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

    projects = [project for project in self.get_projects()["projects"] 
                if project["name"] == name]
    
    if len(projects) > 1:
      cherrypy.log.error("slycat.web.client.__init__.py find_or_create_project", 
        "More than one project matched the given name. Try using a " +
        "different project name instead.")
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
      model = self.request("GET", "/api/models/%s" % (mid), 
                           headers={"accept":"application/json"})
      if "state" in model and model["state"] not in ["waiting", "running"]:
        return
      time.sleep(1.0)

  ##############################################################
  # Functions that manage file uploading using the RESTful API #
  ##############################################################

  def post_uploads(self, mid, parser, aids, input=True):
    """Create Slycat file upload session.

    Create an upload session used to upload files for storage as model artifacts. 
    Once an upload session has been created, use upload_file put_upload_file_part
    to upload files directly from the client to the server.

    Parameters
    ----------
    mid: string, required
      Unique model identifier.
    parser: string,
      Name of parser to call after completion of upload.
    aids: array, required
      Artifact IDs for storage.
    input: boolean, optional
      True to create input artifacts for the model.

    Returns
    -------
    uid: string
      Upload session ID.

    See Also
    --------
    :http:post:`/api/uploads`
    """

    return self.request("POST", "/api/uploads", headers={"content-type":"application/json"},
      data=json.dumps({"mid":mid, "input":input, "parser":parser, "aids":aids}))["id"]

  def put_upload_file_part(self, uid, pid, fid, file_slice):
    """Upload a file or part of a file to Slycat.

    Upload a file (or part of a file) as part of an upload session created with 
    post_uploads.

    Use the “pid” and “fid” parameters to specify that the data being uploaded is 
    for part M of file N. To upload a file from the client, specify the “file” parameter. 

    Parameters
    ----------
    uid: string, required
      Unique file upload session ID.
    pid: string, required
      Zero-based part ID of file being uploaded.
    fid: string, required
      Zero-based file ID for file being uploaded.
    file: file part in bytes, required
      File part to upload.

    See Also
    --------
    :http:put:`/api/uploads/(uid)/files/(fid)/parts/(pid)`
    """
    
    return self.request("PUT", "/api/uploads/%s/files/%s/parts/%s" % (uid, fid, pid),
      data={'file': base64.b64encode(file_slice)})

  def post_upload_finished(self, uid, file_parts):
    """Notify Slycat server that file upload is finished

    Notify the server that all files have been uploaded for the given upload 
    session, and processing can begin. The request must include the uploaded 
    parameter, which specifies the number of files that were uploaded, 
    and the number of parts in each file. The server uses this information to 
    validate that it received every part of every file that the client sent.

    Parameters
    ----------
    uid: string, required
      Unique file upload session ID.
    file_parts: array, required
      Array of length number of files, 
      with each entry number of slices for that file.

    See Also
    --------
    :http:put:`/api/uploads/(uid)/finished`
    """

    return self.request("POST", "/api/uploads/%s/finished" % uid, 
      headers={"content-type":"application/json"},
      data=json.dumps({'uploaded': file_parts}))

  def delete_upload(self, uid):
    """Delete uploaded files from Slycat server

    Delete an upload session used to upload files for storage as model artifacts. 
    This function must be called once the client no longer needs the session, 
    whether the upload(s) have been completed successfully or the client is cancelling 
    an incomplete session.

    Note that you can examine the return codes to see if the files have been completely
    parsed by Slycat.

    Parameters
    ----------
    uid: string, required
      Unique file upload session ID.

    Returns
    -------
    status_code: int
      Http status code:

        * 204 No Content – The upload session and temporary storage has been deleted.
        * 409 Conflict – The upload session cannot be deleted, parsing is in progress. 

    See Also
    --------
    :http:put:`/api/uploads/(uid)`
    """
  
    # call directly to get response code
    response = self.session.delete(self.host + "/api/uploads/%s" % uid, 
                    proxies=self.keywords.get("proxies"), 
                    verify=self.keywords.get("verify"))
    
    # return code
    return response.status_code

  def upload_files(self, mid, file_list, parser, parser_parms, progress=True):
    """Upload a list of files for a given model to the Slycat server.
    The files will be parsed by specified parser.  This is not a direct call
    to the API, but rather a convenience call to load/parse a list of files.

    Parameters
    ----------
    mid: string, required
      Model ID associated with the files to be uploaded.
    file_list: string array, required
      Local files to be uploaded to the Slycat server.  This can be one file,
      but it should be passed as an array with one file.
    parser: string, required
      Name of parser to use on the Slycat server.
    parser_parms: array, required
      Any parameters to be passed to the parser (passed using aids when the 
      upload session is established).
    progress: boolean, optional
      Display a download progress indicator using standard out (will not
      be logged to the log file).
    """

    # how many files?
    num_files = len(file_list)

    # get number of parts for progress bar
    file_slices_to_upload = []
    for fid in range(num_files):
      num_slices = math.ceil(os.path.getsize(file_list[fid]) / self.file_slice_size)
      file_slices_to_upload.append(num_slices)

    # create upload session
    uid = self.post_uploads(mid, parser, parser_parms)

    # keep track of slices uploaded
    file_slices_uploaded = [0] * num_files

    # upload each file
    for fid in range(num_files):
      
      # print progress bar if desired
      if progress:
        print('Uploading "%s":' % file_list[fid])

      # split each file into slices
      with open(file_list[fid], "rb") as file:
        
        # get file slice
        file_slice = file.read(self.file_slice_size)
        while (file_slice != b''):

          # upload slice
          self.put_upload_file_part(uid, file_slices_uploaded[fid], fid, file_slice)

          # advance to next slice
          file_slice = file.read(self.file_slice_size)
          file_slices_uploaded[fid] += 1

          if progress:
            _print_progress_bar(file_slices_uploaded[fid], file_slices_to_upload[fid], 
              prefix = 'Progress:', suffix = 'Complete', length = 50)

    # finish upload
    self.post_upload_finished(uid, file_slices_uploaded)
      
    # wait for parsing to finish
    while True:
      if self.delete_upload(uid) == 409:
        time.sleep(1.0)
      else:
        break

def connect(arguments, **keywords):
  """Factory function for client connections that takes an option parser as input.
  
  Parameters
  ----------
  arguments: argument parser object, required
    Parsed command line arguments. 
  keywords: dictionary, optional
    Additional options to pass to requests.
  
  Returns
  -------
  connection: session for submitting requests to Slycat sever.
  """

  # arguments are from the command line parser,
  # keywords get passed into the actual requests

  # check for --no-verify or security certificate
  if arguments.no_verify:
    keywords["verify"] = False
  elif arguments.verify is not None:
    keywords["verify"] = arguments.verify

  return Connection(auth=(arguments.user, arguments.password),
    host=arguments.host, port=arguments.port, kerberos=arguments.kerberos,
    proxies={"http":arguments.http_proxy, "https":arguments.https_proxy}, 
    file_slice_size=arguments.file_slice_size, **keywords)