import argparse
import collections
import ConfigParser
import couch
import couchdb.client
import datetime
import json
import logging
import os
import sys
import threading
import time
import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.websocket

parser = argparse.ArgumentParser()
parser.add_argument("--config", default="config.ini", help="Path to a file containing configuration parameters.")
arguments = parser.parse_args()

root_path = os.path.dirname(os.path.abspath(__file__))
config_path = arguments.config if os.path.isabs(arguments.config) else os.path.join(root_path, arguments.config)
parser = ConfigParser.SafeConfigParser()
parser.read(config_path)
configuration = {section : {key : eval(value) for key, value in parser.items(section)} for section in parser.sections()}

access_log = logging.getLogger("access")
access_log.propagate = False
access_log.setLevel(logging.INFO)
if configuration["slycat-feed-server"]["access-log"] == "-":
  access_log.addHandler(logging.StreamHandler(sys.stderr))
else:
  access_log.addHandler(logging.handlers.RotatingFileHandler(configuration["slycat-feed-server"]["access-log"], maxBytes=configuration["slycat-feed-server"]["access-log-size"], backupCount=configuration["slycat-feed-server"]["access-log-count"]))

error_log = logging.getLogger("error")
error_log.propagate = False
error_log.setLevel(logging.INFO)
if configuration["slycat-feed-server"]["error-log"] == "-":
  error_log.addHandler(logging.StreamHandler(sys.stderr))
else:
  error_log.addHandler(logging.handlers.RotatingFileHandler(configuration["slycat-feed-server"]["error-log"], maxBytes=configuration["slycat-feed-server"]["error-log-size"], backupCount=configuration["slycat-feed-server"]["error-log-count"]))
error_log.handlers[-1].setFormatter(logging.Formatter(fmt="%(asctime)s  %(message)s", datefmt="[%d/%b/%Y:%H:%M:%S]"))

class log(object):
  access = logging.getLogger("access").info
  error = logging.getLogger("error").info

def log_configuration(tree, indent=""):
  for key, value in sorted(tree.items()):
    if isinstance(value, dict):
      log.error("%s%s:" % (indent, key))
      log_configuration(value, indent + "  ")
    else:
      log.error("%s%s: %s" % (indent, key, value))
log_configuration(configuration)

def is_project_reader(project, user):
  if user in configuration["slycat"]["server-admins"]:
    return True
  if user in [entry["user"] for entry in project["acl"]["administrators"]]:
    return True
  if user in [entry["user"] for entry in project["acl"]["writers"]]:
    return True
  if user in [entry["user"] for entry in project["acl"]["readers"]]:
    return True
  return False

class RawFeed(object):
  def __init__(self, url, database):
    self._url = url
    self._database = database
    self._filter = "slycat/projects-models"
    self._projects = dict() # Keep track of all projects.
    self._models = dict() # Keep track of all models.
    self._project_models = collections.defaultdict(set) # Provide quick access to a project's models.
    self._thread = threading.Thread(name="project-models-feed", target=self._run)
    self._thread.daemon = True
    self._thread.start()
    self._lock = threading.Lock()
    self._clients = set()

  def _run(self):
    last_seq = 0
    last_logged_seq = 0
    timeout = 1000
    while True:
      try:
        server = couchdb.client.Server(url = self._url)
        database = server[self._database]
        log.error("Connected to couchdb %s" % server.version())

        # Keep the cache up-to-date.
        while True:
          for change in database.changes(filter=self._filter, feed="continuous", include_docs=True, since=last_seq, timeout=timeout):
            with self._lock:
              if "last_seq" in change:
                last_seq = change["last_seq"]
              elif "deleted" in change:
                last_seq = change["seq"]
                if change["id"] in self._projects:
                  self._delete_project(change["id"])
                elif change["id"] in self._models:
                  self._delete_model(change["id"])
              else:
                last_seq = change["seq"]
                if change["doc"]["type"] == "project":
                  pid, project = change["id"], change["doc"]
                  self._update_project(pid, project)
                elif change["doc"]["type"] == "model":
                  mid, model = change["id"], change["doc"]
                  self._update_model(mid, model)
          timout=60000
          if last_seq != last_logged_seq:
            last_logged_seq = last_seq
            log.error("Caching %s projects, %s models, sequence %s." % (len(self._projects), len(self._models), last_seq))

      except Exception as e:
        log.error("Waiting for couchdb.")
        time.sleep(2.0)

  def _delete_project(self, pid):
    project = self._projects.pop(pid)
    project_models = self._project_models.pop(pid, set())

    change_message = json.dumps(dict(id=pid, deleted=True))
    for client in self._clients:
      if is_project_reader(project, client.user):
        client.projects.discard(pid)
        client.write_message(change_message)

  def _delete_model(self, mid):
    model = self._models.pop(mid)
    self._project_models[model["project"]].discard(mid)

    change_message = json.dumps(dict(id=mid, deleted=True))
    for client in self._clients:
      if is_project_reader(self._projects[model["project"]], client.user):
        client.write_message(change_message)

  def _update_project(self, pid, project):
    self._projects[pid] = project

    change_message = json.dumps(dict(id=pid, doc=project))
    for client in self._clients:
      if is_project_reader(project, client.user):
        client.write_message(change_message)
        # The user was added to this project.
        if pid not in client.projects:
          client.projects.add(pid)
          for mid in self._project_models[pid]:
            client.write_message(json.dumps(dict(id=mid, doc=self._models[mid])))
      else:
        # The user was removed from this project.
        if pid in client.projects:
          client.projects.discard(pid)
          client.write_message(json.dumps(dict(id=pid, deleted=True)))
          for mid in self._project_models[pid]:
            client.write_message(json.dumps(dict(id=mid, deleted=True)))

  def _update_model(self, mid, model):
    self._models[mid] = model
    self._project_models[model["project"]].add(mid)

    change_message = json.dumps(dict(id=mid, doc=model))
    for client in self._clients:
      if is_project_reader(self._projects[model["project"]], client.user):
        client.write_message(change_message)

  def add_client(self, client):
    with self._lock:
      self._clients.add(client)
      for pid, project in self._projects.items():
        if is_project_reader(project, client.user):
          client.projects.add(pid)
          client.write_message(json.dumps(dict(id=pid, doc=project)))
      for mid, model in self._models.items():
        if model["project"] in self._projects:
          if is_project_reader(self._projects[model["project"]], client.user):
            client.write_message(json.dumps(dict(id=mid, doc=model)))
        else:
          log.error("Model %s belongs to project %s, but the latter isn't in the cache.  This should never happen." % (mid, model["project"]))

  def remove_client(self, client):
    with self._lock:
      self._clients.discard(client)

raw_feed = RawFeed(configuration["slycat"]["couchdb-host"], configuration["slycat"]["couchdb-database"])

class ChangeFeed(tornado.websocket.WebSocketHandler):
  def get(self, *args, **kwargs):
    try:
      # We must have a secure connection.
      if not (self.request.protocol == "https" or self.request.headers.get("x-forwarded-proto") == "https"):
        raise tornado.web.HTTPError(403, reason="Secure connection required.")

      # We must have a session cookie.
      if self.get_cookie("slycatauth", None) is None:
        raise tornado.web.HTTPError(403, reason="No session.")

      # Validate the session cookie.
      sid = self.get_cookie("slycatauth")
      database = couch.BlockingCouch("slycat")
      session = database.get_doc(sid)
      log.error("current session is at %s seconds ::: session expires at %s seconds,  is current session expired? %s" % ((datetime.datetime.utcnow() - datetime.datetime.strptime(session["created"], "%Y-%m-%dT%H:%M:%S.%f")).total_seconds(), configuration["slycat"]["session-timeout"].total_seconds(),(datetime.datetime.utcnow() - datetime.datetime.strptime(session["created"], "%Y-%m-%dT%H:%M:%S.%f")).total_seconds() > configuration["slycat"]["session-timeout"].total_seconds()))
      if (datetime.datetime.utcnow() - datetime.datetime.strptime(session["created"], "%Y-%m-%dT%H:%M:%S.%f")).total_seconds() > configuration["slycat"]["session-timeout"].total_seconds():
        raise tornado.web.HTTPError(403, reason="Session expired.")

      self.user = session["creator"]
      self.projects = set()

      # OK, proceed to upgrade the connection to a websocket.
      tornado.websocket.WebSocketHandler.get(self, *args, **kwargs)
    except tornado.web.HTTPError as e:
      self.set_status(e.status, e.reason)
    except couch.NotFound:
      raise tornado.web.HTTPError(404, reason="Session not found, could be expired, authorization required.")
    except Exception as e:
      raise

    timestamp = datetime.datetime.utcnow().strftime("%d/%b/%Y:%H:%M:%S")
    log.access("%s - %s [%s] \"%s %s %s\" %s - \"%s\"" % (self.request.remote_ip, self.user, timestamp, self.request.method, self.request.uri, self.request.version, self.get_status(), self.request.headers.get("user-agent")))

  def check_origin(self, origin):
    return True

  def open(self, *args, **kwargs):
    raw_feed.add_client(self)
    log.error("Opened feed for %s@%s" % (self.user, self.request.headers.get("x-forwarded-for")))

  def on_close(self):
    log.error("Closed feed for %s@%s" % (self.user, self.request.headers.get("x-forwarded-for")))
    raw_feed.remove_client(self)

application = tornado.web.Application([
  ("/changes-feed", ChangeFeed),
], debug=True)

server = tornado.httpserver.HTTPServer(application)
server.listen(configuration["slycat-feed-server"]["socket-port"], configuration["slycat-feed-server"]["socket-host"])
tornado.ioloop.IOLoop.instance().start()

