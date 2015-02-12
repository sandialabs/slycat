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

def test_project_reader(project, user):
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
    self._last_seq = None
    self._projects = dict()
    self._models = dict()
    self._thread = threading.Thread(name="project-models-feed", target=self._run)
    self._thread.daemon = True
    self._thread.start()
    self._lock = threading.Lock()
    self._clients = set()

  def _run(self):
    server = couchdb.client.Server(url = self._url)
    database = server[self._database]

    # Initialize the cache.
    with self._lock:
      changes = database.changes(filter=self._filter, include_docs=True, since=0)
      self._last_seq = changes["last_seq"]
      for change in changes["results"]:
        if "deleted" in change:
          self._projects.pop(change["id"], None)
          self._models.pop(change["id"], None)
        else:
          if change["doc"]["type"] == "project":
            self._projects[change["id"]] = change["doc"]
          if change["doc"]["type"] == "model":
            self._models[change["id"]] = change["doc"]
      sys.stderr.write("Cached %s projects, %s models from %s records, sequence %s.\n" % (len(self._projects), len(self._models), len(changes["results"]), self._last_seq))

    # Keep the cache up-to-date.
    while True:
      for change in database.changes(filter=self._filter, feed="continuous", include_docs=True, since=self._last_seq, timeout=5000):
        with self._lock:
          if "last_seq" in change:
            self._last_seq = change["last_seq"]
          elif "deleted" in change:
            self._last_seq = change["seq"]
            if change["id"] in self._projects:
              self._projects.pop(change["id"])
              for client in self._clients:
                client.on_change(dict(id=change["id"], deleted=True))
            elif change["id"] in self._models:
              self._models.pop(change["id"])
              for client in self._clients:
                client.on_change(dict(id=change["id"], deleted=True))
          else:
            self._last_seq = change["seq"]
            if change["doc"]["type"] == "project":
              self._projects[change["id"]] = change["doc"]
              for client in self._clients:
                client.on_change(change)
            elif change["doc"]["type"] == "model":
              self._models[change["id"]] = change["doc"]
              for client in self._clients:
                client.on_change(change)

  def add_client(self, client):
    with self._lock:
      self._clients.add(client)
      for id, project in self._projects.items():
        client.on_change(dict(id=id, doc=project))
      for id, model in self._models.items():
        client.on_change(dict(id=id, doc=model))

  def remove_client(self, client):
    with self._lock:
      self._clients.discard(client)

raw_feed = RawFeed(arguments.couchdb_host, arguments.couchdb_database)

class ChangeFeed(tornado.websocket.WebSocketHandler):
  def get(self, *args, **kwargs):
    # Validate the authentication ticket first.
    tid = self.get_query_argument("ticket")
    database = couch.BlockingCouch("slycat")
    self._ticket = database.get_doc(tid)
    database.delete_doc(self._ticket)

    if (datetime.datetime.utcnow() - datetime.datetime.strptime(self._ticket["created"], "%Y-%m-%dT%H:%M:%S.%f")).total_seconds() > arguments.max_ticket_age:
      raise tornado.web.HTTPError(403, reason="Ticket expired.")

    # OK, proceed to upgrade the connection to a websocket.
    return tornado.websocket.WebSocketHandler.get(self, *args, **kwargs)

  def open(self, *args, **kwargs):
    self._projects = dict() # Keep track of the set of projects visible to the caller.
    self._models = dict() # Keep track of the set of models visible to the caller.
    raw_feed.add_client(self)

  def on_change(self, change):
    if "deleted" in change:
      if change["id"] in self._projects: # Caller visible project has been deleted.
        del self._projects[change["id"]]
        self.write_message(json.dumps(change))
      elif change["id"] in self._models: # Caller visible model has been deleted.
        del self._models[change["id"]]
        self.write_message(json.dumps(change))
    else:
      if change["doc"]["type"] == "project":
        pid, project = change["id"], change["doc"]
        if test_project_reader(project, self._ticket["creator"]): # Caller visible project has been created/updated.
          self._projects[pid] = project
          self.write_message(json.dumps(change))
        else:
          if pid in self._projects: # Caller lost access to the project, make it look like a deletion.
            del self._projects[pid]
            self.write_message(json.dumps(dict(id=pid, deleted=True)))
            for mid in [model["_id"] for model in self._models.values() if model["project"] == pid]:
              del self._models[mid]
              self.write_message(json.dumps(dict(id=mid, deleted=True)))
      elif change["doc"]["type"] == "model":
        mid, model = change["id"], change["doc"]
        if model["project"] in self._projects and test_project_reader(self._projects[model["project"]], self._ticket["creator"]): # Caller visible model has been created/updated.
          self._models[mid] = model
          self.write_message(json.dumps(change))

  def on_close(self):
    raw_feed.remove_client(self)

application = tornado.web.Application([
  ("/change-feed", ChangeFeed),
], debug=True)

#server = tornado.httpserver.HTTPServer(application, ssl_options={"certfile":"../web-server/web-server.pem", "keyfile":"../web-server/web-server.key"})
server = tornado.httpserver.HTTPServer(application)
server.listen(arguments.port)
tornado.ioloop.IOLoop.instance().start()

