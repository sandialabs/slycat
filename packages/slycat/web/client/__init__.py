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

class option_parser(argparse.ArgumentParser):
  """Returns an instance of argparse.ArgumentParser, pre-configured with arguments to connect to a Slycat server."""
  def __init__(self, *arguments, **keywords):
    argparse.ArgumentParser.__init__(self, *arguments, **keywords)

    self.add_argument("--host", default="https://localhost:8092", help="Root URL of the Slycat server.  Default: %(default)s")
    self.add_argument("--http-proxy", default="", help="HTTP proxy URL.  Default: %(default)s")
    self.add_argument("--https-proxy", default="", help="HTTPS proxy URL.  Default: %(default)s")
    self.add_argument("--no-verify", default=False, action="store_true", help="Disable HTTPS host certificate verification.")
    self.add_argument("--log-level", default="info", choices=["debug", "info", "warning", "error", "critical"], help="Log level.  Default: %(default)s")
    self.add_argument("--password", default=None)
    self.add_argument("--user", default=getpass.getuser(), help="Slycat username.  Default: %(default)s")
    self.add_argument("--verify", default=None, help="Specify a certificate to use for HTTPS host certificate verification.")

  def parse_args(self):
    if "SLYCAT" in os.environ:
      sys.argv += shlex.split(os.environ["SLYCAT"])

    arguments = argparse.ArgumentParser.parse_args(self)
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

class connection(object):
  """Encapsulates a set of requests to the given host.  Additional keyword
  arguments must be compatible with the Python Requests library,
  http://docs.python-requests.org/en/latest"""
  def __init__(self, host="http://localhost:8092", **keywords):
    self.host = host
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
    """Deletes an existing model."""
    self.request("DELETE", "/models/%s" % (mid))

  def delete_project(self, pid):
    """Deletes an existing project."""
    self.request("DELETE", "/projects/%s" % (pid))

  def get_bookmark(self, bid):
    return self.request("GET", "/bookmarks/%s" % (bid))

  def get_model_array_attribute_chunk(self, mid, name, array, attribute, ranges, type=None):
    """Returns a hyperslice from an array artifact attribute.  Uses JSON to transfer the data unless the attribute type is specified."""
    ranges = require_array_ranges(ranges)
    if ranges is None:
      raise Exception("An explicit chunk range is required.")
    if type is None or type == "string":
      return self.request("GET", "/models/%s/arraysets/%s/arrays/%s/attributes/%s/chunk?ranges=%s" % (mid, name, array, attribute, ",".join([str(item) for range in ranges for item in range])), headers={"accept":"application/json"})
    else:
      shape = tuple([end - begin for begin, end in ranges])
      content = self.request("GET", "/models/%s/arraysets/%s/arrays/%s/attributes/%s/chunk?ranges=%s&byteorder=%s" % (mid, name, array, attribute, ",".join([str(item) for range in ranges for item in range]), sys.byteorder), headers={"accept":"application/octet-stream"})
      return numpy.fromstring(content, dtype=type).reshape(shape)

  def get_model_array_attribute_statistics(self, mid, name, array, attribute):
    """Returns statistics describing an array artifact attribute."""
    return self.request("GET", "/models/%s/arraysets/%s/arrays/%s/attributes/%s/statistics" % (mid, name, array, attribute), headers={"accept":"application/json"})

  def get_model_array_metadata(self, mid, name, array):
    """Returns the metadata for an array artifacat."""
    return self.request("GET", "/models/%s/arraysets/%s/arrays/%s/metadata" % (mid, name, array), headers={"accept":"application/json"})

  def get_model(self, mid):
    """Returns a single model."""
    return self.request("GET", "/models/%s" % mid, headers={"accept":"application/json"})

  def get_model_file(self, mid, name):
    return self.request("GET", "/models/%s/files/%s" % (mid, name))

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

  def post_remote(self, hostname, username, password):
    return self.request("POST", "/remote", headers={"content-type":"application/json"}, data=json.dumps({"hostname":hostname, "username":username, "password":password}))["sid"]

  def post_remote_browse(self, sid, path, file_reject=None, file_allow=None, directory_allow=None, directory_reject=None):
    body = {"sid":sid, "path":path}
    if file_reject is not None:
      body["file-reject"] = file_reject
    if file_allow is not None:
      body["file-allow"] = file_allow
    if directory_reject is not None:
      body["directory-reject"] = directory_reject
    if directory_allow is not None:
      body["directory-allow"] = directory_allow
    return self.request("POST", "/remote/browse", headers={"content-type":"application/json"}, data=json.dumps(body))

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
    """Sets a model parameter value."""
    self.request("PUT", "/models/%s/parameters/%s" % (mid, name), headers={"content-type":"application/json"}, data=json.dumps({"value":value, "input":input}))

  def put_project(self, pid, project):
    """Modifies a project."""
    return self.request("PUT", "/projects/%s" % pid, headers={"content-type":"application/json"}, data=json.dumps(project))

  ###########################################################################################################
  # Convenience functions that layer additional functionality atop the RESTful API

  def find_project(self, name):
    """Return a project by name."""
    projects = [project for project in self.get_projects() if project["name"] == name]

    if len(projects) > 1:
      raise Exception("More than one project matched the given name.")
    elif len(projects) == 1:
      return projects[0]
    else:
      raise Exception("No project matched the given name.")

  def find_or_create_project(self, name, description=""):
    """Looks-up a project by name, creating it if it doesn't already exist."""
    projects = [project for project in self.get_projects() if project["name"] == name]

    if len(projects) > 1:
      raise Exception("More than one project matched the given name.  Try using a different project name instead.")
    elif len(projects) == 1:
      return projects[0]["_id"]
    else:
      return self.post_projects(name, description)

  def update_model(self, mid, **kwargs):
    """Updates the model state/result/progress/message."""
    model = {key : value for key, value in kwargs.items() if value is not None}
    self.put_model(mid, model)

  def update_model(self, mid, **kwargs):
    """Updates the model state/result/progress/message."""
    model = {key : value for key, value in kwargs.items() if value is not None}
    self.put_model(mid, model)

  def join_model(self, mid):
    """Wait for a model to complete before returning.

    Note that a model that hasn't been finished will never complete - you should
    ensure that post_model_finish() is called successfully before calling
    join_model().
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
  return connection(auth=(arguments.user, arguments.password if arguments.password is not None else getpass.getpass("%s password: " % arguments.user)), host=arguments.host, proxies={"http":arguments.http_proxy, "https":arguments.https_proxy}, **keywords)

