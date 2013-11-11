# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cStringIO
import getpass
import itertools
import json
import numpy
import optparse
import os
import requests
import shlex
import struct
import sys
import time

class dev_null:
  """Do-nothing stream object, for disabling logging."""
  def write(*arguments, **keywords):
    pass

def binary_encoder(sequence):
  for value in sequence:
    if isinstance(value, basestring):
      yield struct.pack("<I", len(value) + 1)
      yield value
      yield "\0"
    elif isinstance(value, int):
      yield struct.pack("<q", value)
    else:
      yield struct.pack("<d", value)

def zip_times(ids, times, rows):
  for id, time, row in itertools.izip(ids, times, rows):
    yield id
    yield time
    for field in row:
      yield field

def format_code(array):
  if array.dtype == numpy.int64:
    return "q"
  elif array.dtype == numpy.float64:
    return "d"
  raise Exception("Unknown array type: %s" % array.dtype)

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
  # Functions that map directly to the underlying RESTful API

  def get_projects(self):
    """Returns all projects."""
    return self.request("GET", "/projects", headers={"accept":"application/json"})

  def create_project(self, name, description=""):
    """Creates a new project, returning the project ID."""
    return self.request("POST", "/projects", headers={"content-type":"application/json"}, data=json.dumps({"name":name, "description":description}))["id"]

  def get_project(self, pid):
    """Returns a single project."""
    return self.request("GET", "/projects/%s" % pid, headers={"accept":"application/json"})

  def put_project(self, pid, project):
    """Modifies a project."""
    return self.request("PUT", "/projects/%s" % pid, headers={"content-type":"application/json"}, data=json.dumps(project))

  def delete_project(self, pid):
    """Deletes an existing project."""
    self.request("DELETE", "/projects/%s" % (pid))

  ########################################
  # Currently untested from here down

  def get_project_models(self, pid):
    """Returns every model in a project."""
    return self.request("GET", "/projects/%s/models" % pid, headers={"accept":"application/json"})

  def get_model(self, mid):
    """Returns a single model."""
    return self.request("GET", "/models/%s" % mid, headers={"accept":"application/json"})

  def create_model_worker(self, pid, type, name, marking, description=""):
    """Creates a new model worker, returning the worker ID."""
    return self.request("POST", "/projects/%s/models" % (pid), headers={"content-type":"application/json"}, data=json.dumps({"model-type":type, "name":name, "marking":marking, "description":description}))["wid"]

  def create_generic_model_worker(self, pid, name, marking, description=""):
    """Creates a new generic model worker, returning the worker ID."""
    return self.create_model_worker(pid, "generic", name, marking, description)

  def create_cca_model_worker(self, pid, name, marking, description=""):
    """Creates a new CCA model worker, returning the worker ID."""
    return self.create_model_worker(pid, "cca3", name, marking, description)

  def create_timeseries_model_worker(self, pid, name, marking, description=""):
    """Creates a new timeseries  model worker, returning the worker ID."""
    return self.create_model_worker(pid, "timeseries", name, marking, description)

  def create_bookmark(self, pid, bookmark):
    return self.request("POST", "/projects/%s/bookmarks" % (pid), headers={"content-type":"application/json"}, data=json.dumps(bookmark))["id"]

  def get_bookmark(self, bid):
    return self.request("GET", "/bookmarks/%s" % (bid))

  def start_table(self, mwid, name, row_count, column_names, column_types):
    """Starts uploading a new table to a model worker."""
    self.request("POST", "/workers/%s/model/start-table" % (mwid), headers={"content-type":"application/json"}, data=json.dumps({"name":name, "row-count":row_count, "column-names":column_names, "column-types":column_types}))

  def send_table_column(self, mwid, name, column, data, begin=None):
    """Appends a column (subset) to a model worker table."""
    if begin is None:
      begin = 0
    end = begin + len(data)
    if isinstance(data, numpy.ndarray):
      self.request("POST", "/workers/%s/model/send-table-column" % (mwid), data={"name":name, "column":column, "begin":begin, "end":end, "byteorder":sys.byteorder}, files={"data":data.tostring(order="C")})
    else:
      self.request("POST", "/workers/%s/model/send-table-column" % (mwid), data={"name":name, "column":column, "begin":begin, "end":end}, files={"data":json.dumps(data)})

  def finish_table(self, mwid, name):
    """Completes uploading a model worker table."""
    self.request("POST", "/workers/%s/model/finish-table" % (mwid), headers={"content-type":"application/json"}, data=json.dumps({"name":name}))

  def start_timeseries(self, mwid, name, column_names, column_types):
    """Starts uploading a new timeseries to a model worker."""
    self.request("POST", "/workers/%s/model/start-timeseries" % (mwid), headers={"content-type":"application/json"}, data=json.dumps({"name":name, "column-names":column_names, "column-types":column_types}))

  def send_timeseries_rows(self, mwid, name, ids, times, rows):
    """Appends zero-to-many rows to a model worker timeseries."""
    buffer = cStringIO.StringIO()
    for chunk in binary_encoder(zip_times(ids, times, rows)):
      buffer.write(chunk)
    self.request("POST", "/workers/%s/model/send-timeseries-rows" % (mwid), data={"name":name}, files={"rows":buffer.getvalue()})

  def send_timeseries_columns(self, mwid, name, ids, times, *columns):
    """Appends zero-to-many columns to a model worker timeseries set."""
    format = "<" + "".join([format_code(array) for array in [ids, times] + list(columns)])
    buffer = cStringIO.StringIO()
    for row in itertools.izip(ids, times, *columns):
      buffer.write(struct.pack(format, *row))
    self.request("POST", "/workers/%s/model/send-timeseries-rows" % (mwid), data={"name":name}, files={"rows":buffer.getvalue()})

  def finish_timeseries(self, mwid, name):
    """Completes uploading a model worker timeseries."""
    self.request("POST", "/workers/%s/model/finish-timeseries" % (mwid), headers={"content-type":"application/json"}, data=json.dumps({"name":name}))

  def set_parameter(self, mwid, name, value):
    """Sets a model worker parameter value."""
    self.request("POST", "/workers/%s/model/set-parameter" % (mwid), headers={"content-type":"application/json"}, data=json.dumps({"name":name, "value":value}))

  def finish_model(self, mwid):
    """Completes a model, returning the new model ID."""
    return self.request("POST", "/workers/%s/model/finish-model" % (mwid), headers={"content-type":"application/json"}, data=json.dumps({}))["mid"]

  def get_workers(self):
    """Returns all workers."""
    return self.request("GET", "/workers", headers={"accept":"application/json"})["workers"]

  def stop_worker(self, wid):
    """Stops a running worker."""
    self.request("PUT", "/workers/%s" % (wid), headers={"content-type":"application/json"}, data=json.dumps({"result" : "stopped"}))

  def join_worker(self, wid):
    """Waits for a worker to complete, then returns.  Note that some workers
    (such as a model that's still waiting for inputs) will never
    complete on their own - you should call stop_worker() first."""
    while True:
      worker = self.request("GET", "/workers/%s" % (wid), headers={"accept":"application/json"})
      if "result" in worker and worker["result"] is not None:
        return
      time.sleep(1.0)

  def delete_worker(self, wid, stop=False):
    """Immediately deletes a worker.  If you want to wait for the worker to
    complete first, use stop=True."""
    if stop:
      self.stop_worker(wid)
      self.join_worker(wid)
    self.request("DELETE", "/workers/%s" % (wid))

  ###########################################################################################################3
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

def connect(options, **keywords):
  """Factory function for client connections that takes an option parser as input."""
  import getpass
  if options.no_verify and (options.verify is not None):
    raise Exception("Cannot use --verify with --no-verify.")
  verify = options.verify if options.verify is not None else not options.no_verify
  return connection(auth=(options.user, getpass.getpass("%s password: " % options.user)), host=options.host, proxies={"http":options.http_proxy, "https":options.https_proxy}, verify=verify, log=sys.stderr if options.verbose else dev_null(), **keywords)

