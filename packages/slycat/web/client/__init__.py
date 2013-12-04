# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import getpass
import json
import numpy
import optparse
import os
import requests
import shlex
import sys
import time

from slycat.array import *

def require_float(value):
  if not isinstance(value, float):
    raise Exception("Not a floating-point value.")
  return value

def require_string(value):
  if not isinstance(value, basestring):
    raise Exception("Not a string value.")
  return value

def require_array_ranges(ranges):
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

class dev_null:
  """Do-nothing stream object, for disabling logging."""
  def write(*arguments, **keywords):
    pass

class option_parser(optparse.OptionParser):
  """Returns an instance of optparse.OptionParser, pre-configured with options
  to connect to a Slycat server."""
  def __init__(self, *arguments, **keywords):
    optparse.OptionParser.__init__(self, *arguments, **keywords)

    self.add_option("--host", default="https://localhost:8092", help="Root URL of the Slycat server.  Default: %default")
    self.add_option("--http-proxy", default="", help="HTTP proxy URL.  Default: %default")
    self.add_option("--https-proxy", default="", help="HTTPS proxy URL.  Default: %default")
    self.add_option("--no-verify", default=False, action="store_true", help="Disable HTTPS host certificate verification.")
    self.add_option("--user", default=getpass.getuser(), help="Slycat username.  Default: %default")
    self.add_option("--verbose", default=False, action="store_true", help="Verbose output.")
    self.add_option("--verify", default=None, help="Specify a certificate to use for HTTPS host certificate verification.")

  def parse_args(self):
    if "SLYCAT" in os.environ:
      sys.argv += shlex.split(os.environ["SLYCAT"])
    return optparse.OptionParser.parse_args(self)

class connection(object):
  """Encapsulates a set of requests to the given host.  Additional keyword
  arguments must be compatible with the Python Requests library,
  http://docs.python-requests.org/en/latest"""
  def __init__(self, host="http://localhost:8092", log=sys.stderr, **keywords):
    self.host = host
    self.log = log
    self.keywords = keywords
    self.session = requests.Session()

  def request(self, method, path, **keywords):
    """Makes a request with the given method and path, returning the body of
    the response.  Additional keyword arguments must be compatible with the
    Python Requests library, http://docs.python-requests.org/en/latest"""

    # Combine per-request and per-connection keyword arguments ...
    keywords.update(self.keywords)

    # Combine host and path to produce the final request URI ...
    uri = self.host + path

    # Try extracting a user name ...
    user = keywords.get("auth", ("", ""))[0]

    self.log.write("%s %s %s" % (user, method, uri))

    if "data" in keywords:
      self.log.write(" %s" % (keywords["data"]))

    try:
      response = self.session.request(method, uri, **keywords)

      self.log.write(" => %s %s" % (response.status_code, response.raw.reason))

      response.raise_for_status()

      body = None
      if response.headers["content-type"].startswith("application/json"):
        body = response.json()
      else:
        body = response.content

#      if response.headers["content-type"].startswith("text/html"):
#        self.log.write(" => <html>...</html>")
#      else:
#        self.log.write(" => %s" % (body)
      self.log.write("\n")
      return body
    except:
      self.log.write("\n")
      raise

  ###########################################################################################################3
  # Low-level functions that map directly to the underlying RESTful API

  def delete_model(self, mid):
    """Deletes an existing model."""
    self.request("DELETE", "/models/%s" % (mid))

  def delete_project(self, pid):
    """Deletes an existing project."""
    self.request("DELETE", "/projects/%s" % (pid))

  def get_bookmark(self, bid):
    return self.request("GET", "/bookmarks/%s" % (bid))

  def get_model_array_chunk(self, mid, name, array, attribute, ranges, type=None):
    """Returns a hyperslice from an array artifact attribute.  Uses JSON to transfer the data unless the attribute type is specified."""
    ranges = require_array_ranges(ranges)
    if ranges is None:
      raise Exception("An explicit chunk range is required.")
    if type is None or type == "string":
      return self.request("GET", "/models/%s/array-sets/%s/arrays/%s/attributes/%s/chunk?ranges=%s" % (mid, name, array, attribute, ",".join([str(item) for range in ranges for item in range])), headers={"accept":"application/json"})
    else:
      shape = tuple([end - begin for begin, end in ranges])
      content = self.request("GET", "/models/%s/array-sets/%s/arrays/%s/attributes/%s/chunk?ranges=%s&byteorder=%s" % (mid, name, array, attribute, ",".join([str(item) for range in ranges for item in range]), sys.byteorder), headers={"accept":"application/octet-stream"})
      return numpy.fromstring(content, dtype=type).reshape(shape)

  def get_model_array_metadata(self, mid, name, array):
    """Returns the metadata for an array artifacat."""
    return self.request("GET", "/models/%s/array-sets/%s/arrays/%s/metadata" % (mid, name, array), headers={"accept":"application/json"})

  def get_model(self, mid):
    """Returns a single model."""
    return self.request("GET", "/models/%s" % mid, headers={"accept":"application/json"})

  def get_model_table_chunk(self, mid, name, array, rows, columns):
    """Returns a chunk (set of rows and columns) from a table (array) artifact."""
    return self.request("GET", "/models/%s/tables/%s/arrays/%s/chunk?rows=%s&columns=%s" % (mid, name, array, ",".join([str(row) for row in rows]), ",".join([str(column) for column in columns])), headers={"accept":"application/json"})

  def get_model_table_metadata(self, mid, name, array):
    """Returns the metadata for a table (array) artifact."""
    return self.request("GET", "/models/%s/tables/%s/arrays/%s/metadata" % (mid, name, array), headers={"accept":"application/json"})

  def get_project_models(self, pid):
    """Returns every model in a project."""
    return self.request("GET", "/projects/%s/models" % pid, headers={"accept":"application/json"})

  def get_project(self, pid):
    """Returns a single project."""
    return self.request("GET", "/projects/%s" % pid, headers={"accept":"application/json"})

  def get_projects(self):
    """Returns all projects."""
    return self.request("GET", "/projects", headers={"accept":"application/json"})

  def get_user(self, uid):
    return self.request("GET", "/users/%s" % uid, headers={"accept":"application/json"})

  def post_model_finish(self, mid):
    """Completes a model."""
    self.request("POST", "/models/%s/finish" % (mid))

  def post_project_bookmarks(self, pid, bookmark):
    return self.request("POST", "/projects/%s/bookmarks" % (pid), headers={"content-type":"application/json"}, data=json.dumps(bookmark))["id"]

  def post_project_models(self, pid, type, name, marking="", description=""):
    """Creates a new model, returning the model ID."""
    return self.request("POST", "/projects/%s/models" % (pid), headers={"content-type":"application/json"}, data=json.dumps({"model-type":type, "name":name, "marking":marking, "description":description}))["id"]

  def post_projects(self, name, description=""):
    """Creates a new project, returning the project ID."""
    return self.request("POST", "/projects", headers={"content-type":"application/json"}, data=json.dumps({"name":name, "description":description}))["id"]

  def put_model(self, mid, model):
    self.request("PUT", "/models/%s" % (mid), headers={"content-type":"application/json"}, data=json.dumps(model))

  def put_model_array_attribute(self, mid, name, array, attribute, data, ranges=None):
    """Sends an array attribute (or a slice of an array attribute) to the server."""
    ranges = require_array_ranges(ranges)
    if isinstance(data, numpy.ndarray):
      if ranges is None:
        ranges = [(0, end) for end in data.shape]
      if data.dtype.char == "S":
        self.request("PUT", "/models/%s/array-sets/%s/arrays/%s/attributes/%s" % (mid, name, array, attribute), data={}, files={"ranges" : json.dumps(ranges), "data":json.dumps(data.tolist())})
      else:
        self.request("PUT", "/models/%s/array-sets/%s/arrays/%s/attributes/%s" % (mid, name, array, attribute), data={"byteorder":sys.byteorder}, files={"ranges" : json.dumps(ranges), "data":data.tostring(order="C")})
    else:
      if ranges is None:
        ranges = [(0, len(data))]
      self.request("PUT", "/models/%s/array-sets/%s/arrays/%s/attributes/%s" % (mid, name, array, attribute), data={}, files={"ranges" : json.dumps(ranges), "data":json.dumps(data)})

  def put_model_array(self, mid, name, array, attributes, dimensions):
    """Starts a new array set array, ready to receive data."""
    self.request("PUT", "/models/%s/array-sets/%s/arrays/%s" % (mid, name, array), headers={"content-type":"application/json"}, data=json.dumps({"attributes":require_attributes(attributes), "dimensions":require_dimensions(dimensions)}))

  def put_model_array_set(self, mid, name, input=True):
    """Starts a new model array set artifact, ready to receive data."""
    self.request("PUT", "/models/%s/array-sets/%s" % (mid, name), headers={"content-type":"application/json"}, data=json.dumps({"input":input}))

  def put_model_parameter(self, mid, name, value, input=True):
    """Sets a model parameter value."""
    self.request("PUT", "/models/%s/parameters/%s" % (mid, name), headers={"content-type":"application/json"}, data=json.dumps({"value":value, "input":input}))

  def put_project(self, pid, project):
    """Modifies a project."""
    return self.request("PUT", "/projects/%s" % pid, headers={"content-type":"application/json"}, data=json.dumps(project))

  ###########################################################################################################
  # Aliases for low-level functions that make client code more readable.

  def create_project(self, name, description=""):
    """Creates a new project, returning the project ID."""
    return self.post_projects(name, description)

  def create_model(self, pid, type, name, marking="", description=""):
    """Creates a new model, returning the model ID."""
    return self.post_project_models(pid, type, name, marking, description)

  def store_bookmark(self, pid, bookmark):
    return self.post_project_bookmarks(pid, bookmark)

  def set_model_state(self, mid, state):
    """Sets the current model state."""
    self.put_model(mid, {"state": require_string(state)})

  def set_model_result(self, mid, result):
    """Sets the current model result."""
    self.put_model(mid, {"result": require_string(result)})

  def set_model_progress(self, mid, progress):
    """Sets the current model progress."""
    self.put_model(mid, {"progress": require_float(progress)})

  def set_model_message(self, mid, message):
    """Sets the current model message."""
    self.put_model(mid, {"message": require_string(message)})

  def store_parameter(self, mid, name, value, input=True):
    """Sets a model parameter value."""
    self.put_model_parameter(mid, name, value, input)

  def start_array_set(self, mid, name, input=True):
    """Starts a new model array set artifact, ready to receive data."""
    self.put_model_array_set(mid, name, input)

  def start_array(self, mid, name, array, attributes, dimensions):
    """Starts a new array set array, ready to receive data."""
    self.put_model_array(mid, name, array, attributes, dimensions)

  def store_array_attribute(self, mid, name, array, attribute, data, ranges=None):
    """Sends an array attribute (or a slice of an array attribute) to the server."""
    self.put_model_array_attribute(mid, name, array, attribute, data, ranges)

  def finish_model(self, mid):
    """Completes a model."""
    self.post_model_finish(mid)

  ###########################################################################################################
  # Convenience functions that layer additional functionality atop the RESTful API

  def find_or_create_project(self, project, name, description):
    """Looks-up a project by name or id, or creates a new project with the given name and description."""
    if project is None:
      return self.create_project(name, description)
    projects = self.request("GET", "/projects", headers={"accept":"application/json"})

    # Look for an ID match ...
    ids = [p["_id"] for p in projects if p["_id"] == project]
    if len(ids) == 1:
      return ids[0]

    # Look for a name match ...
    ids = [p["_id"] for p in projects if p["name"] == project]
    if len(ids) == 1:
      return ids[0]
    if len(ids) > 1:
      raise Exception("More than one project matched the given name.  Try using a project ID instead.")

    raise Exception("Project %s not found." % project)

  def join_model(self, mid):
    """Waits for a model to complete, then returns.

    Note that a model that hasn't been finished will never complete, you should
    ensure that finish_model() is called successfully before calling
    join_model().
    """
    while True:
      model = self.request("GET", "/models/%s" % (mid), headers={"accept":"application/json"})
      if "state" in model and model["state"] not in ["waiting", "running"]:
        return
      time.sleep(1.0)


def connect(options, **keywords):
  """Factory function for client connections that takes an option parser as input."""
  import getpass
  if options.no_verify and (options.verify is not None):
    raise Exception("Cannot use --verify with --no-verify.")
  verify = options.verify if options.verify is not None else not options.no_verify
  return connection(auth=(options.user, getpass.getpass("%s password: " % options.user)), host=options.host, proxies={"http":options.http_proxy, "https":options.https_proxy}, verify=verify, log=sys.stderr if options.verbose else dev_null(), **keywords)

