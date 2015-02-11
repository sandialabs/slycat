import argparse
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

class Feed(object):
  def __init__(self, url, database, name, filter):
    self._url = url
    self._database = database
    self._name = name
    self._filter = filter
    self._last_seq = None
    self._storage = dict()
    self._thread = threading.Thread(name=name, target=self._run)
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
          if change["id"] in self._storage:
            del self._storage[change["id"]]
        else:
          self._storage[change["id"]] = dict(id=change["id"], doc=change["doc"])
      sys.stderr.write("%s cached %s objects from %s records, sequence %s.\n" % (self._name, len(self._storage), len(changes["results"]), self._last_seq))

    # Keep the cache up-to-date.
    while True:
      for change in database.changes(filter=self._filter, feed="continuous", include_docs=True, since=self._last_seq, timeout=5000):
        with self._lock:
          if "last_seq" in change:
            self._last_seq = change["last_seq"]
          elif "deleted" in change:
            self._last_seq = change["seq"]
            if change["id"] in self._storage:
              del self._storage[change["id"]]
              for client in self._clients:
                client.on_change(dict(id=change["id"], deleted=True))
          else:
            self._last_seq = change["seq"]
            self._storage[change["id"]] = dict(id=change["id"], doc=change["doc"])
            for client in self._clients:
              client.on_change(dict(id=change["id"], doc=change["doc"]))

  def add_client(self, client):
    with self._lock:
      self._clients.add(client)
      for change in self._storage.values():
        client.on_change(change)

  def remove_client(self, client):
    with self._lock:
      self._clients.discard(client)

class ProjectsFeed(tornado.websocket.WebSocketHandler):
  feed = Feed(arguments.couchdb_host, arguments.couchdb_database, "projects-feed", "slycat/projects")

  def open(self, *args, **kwargs):
    tid = self.get_query_argument("ticket")
    database = couch.BlockingCouch("slycat")
    self.ticket = database.get_doc(tid)
    database.delete_doc(self.ticket)
    self.id_cache = set() # Keep track of the set of project ids visible to the caller.
    ProjectsFeed.feed.add_client(self)

  def on_change(self, change):
    if "deleted" in change:
      if change["id"] in self.id_cache: # Caller visible project has been deleted.
        self.write_message(json.dumps(change))
    else:
      project = change["doc"]
      if test_project_reader(project, self.ticket["creator"]): # Caller visible project has been created/updated.
        self.id_cache.add(change["id"])
        self.write_message(json.dumps(change))
      else:
        if change["id"] in self.id_cache: # Caller lost access to the project, make it look like a deletion.
          self.id_cache.remove(change["id"])
          self.write_message(json.dumps(dict(id=change["id"], deleted=True)))

#  def on_message(self, message):
#    pass

  def on_close(self):
    ProjectsFeed.feed.remove_client(self)

application = tornado.web.Application([
  ("/projects-feed", ProjectsFeed),
], debug=True)

#server = tornado.httpserver.HTTPServer(application, ssl_options={"certfile":"../web-server/web-server.pem", "keyfile":"../web-server/web-server.key"})
server = tornado.httpserver.HTTPServer(application)
server.listen(arguments.port)
tornado.ioloop.IOLoop.instance().start()

