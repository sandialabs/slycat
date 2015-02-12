import argparse
import collections
import couch
import couchdb.client
import datetime
import json
import sys
import threading
import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.websocket

parser = argparse.ArgumentParser()
parser.add_argument("--couchdb-database", default="slycat", help="CouchDB database.  Default: %(default)s")
parser.add_argument("--couchdb-host", default="http://localhost:5984", help="CouchDB host.  Default: %(default)s")
parser.add_argument("--max-ticket-age", type=float, default=5, help="Maximum age of an authentication ticket in seconds.  Default: %(default)s")
parser.add_argument("--port", type=int, default=8093, help="Feed server port.  Default: %(default)s")
arguments = parser.parse_args()

def is_project_reader(project, user):
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
    self._last_seq = 0
    self._projects = dict() # Keep track of all projects.
    self._models = dict() # Keep track of all models.
    self._project_models = collections.defaultdict(set) # Provide quick access to a project's models.
    self._thread = threading.Thread(name="project-models-feed", target=self._run)
    self._thread.daemon = True
    self._thread.start()
    self._lock = threading.Lock()
    self._clients = set()

  def _run(self):
    server = couchdb.client.Server(url = self._url)
    database = server[self._database]

    # Keep the cache up-to-date.
    while True:
      for change in database.changes(filter=self._filter, feed="continuous", include_docs=True, since=self._last_seq, timeout=60000):
        with self._lock:
          if "last_seq" in change:
            self._last_seq = change["last_seq"]
          elif "deleted" in change:
            self._last_seq = change["seq"]
            if change["id"] in self._projects:
              self._delete_project(change["id"])
            elif change["id"] in self._models:
              self._delete_model(change["id"])
          else:
            self._last_seq = change["seq"]
            if change["doc"]["type"] == "project":
              pid, project = change["id"], change["doc"]
              self._update_project(pid, project)
            elif change["doc"]["type"] == "model":
              mid, model = change["id"], change["doc"]
              self._update_model(mid, model)
      sys.stderr.write("Tracking %s projects, %s models, sequence %s.\n" % (len(self._projects), len(self._models), self._last_seq))

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
        if is_project_reader(self._projects[model["project"]], client.user):
          client.write_message(json.dumps(dict(id=mid, doc=model)))

  def remove_client(self, client):
    with self._lock:
      self._clients.discard(client)

raw_feed = RawFeed(arguments.couchdb_host, arguments.couchdb_database)

class ChangeFeed(tornado.websocket.WebSocketHandler):
  def get(self, *args, **kwargs):
    # Validate the authentication ticket first.
    tid = self.get_query_argument("ticket")
    database = couch.BlockingCouch("slycat")
    ticket = database.get_doc(tid)
    database.delete_doc(ticket)

    if (datetime.datetime.utcnow() - datetime.datetime.strptime(ticket["created"], "%Y-%m-%dT%H:%M:%S.%f")).total_seconds() > arguments.max_ticket_age:
      raise tornado.web.HTTPError(403, reason="Ticket expired.")

    self.user = ticket["creator"]
    self.projects = set()

    # OK, proceed to upgrade the connection to a websocket.
    return tornado.websocket.WebSocketHandler.get(self, *args, **kwargs)

  def open(self, *args, **kwargs):
    raw_feed.add_client(self)

  def on_close(self):
    raw_feed.remove_client(self)

application = tornado.web.Application([
  ("/change-feed", ChangeFeed),
], debug=True)

server = tornado.httpserver.HTTPServer(application, ssl_options={"certfile":"../web-server/web-server.pem", "keyfile":"../web-server/web-server.key"})
#server = tornado.httpserver.HTTPServer(application)
server.listen(arguments.port)
tornado.ioloop.IOLoop.instance().start()

