# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

"""Slycat uses `CouchDB <http://couchdb.apache.org>`_ as its primary storage
for projects, models, bookmarks, metadata, and small model artifacts.  For
large model artifacts such as :mod:`darrays<slycat.darray>`, the CouchDB
database stores links to HDF5 files stored on disk.
"""

from __future__ import absolute_import

import cherrypy
import couchdb.client
import threading
import time
import uuid

class Cache(object):
  def __init__(self, name, filter):
    self._name = name
    self._filter = filter
    self._last_seq = None
    self._storage = dict()
    self._thread = threading.Thread(name=name, target=self._run)
    self._thread.daemon = True
    self._thread.start()
    self._lock = threading.Lock()

  def _run(self):
    while True:
      try:
        database = connect()
        break
      except:
        cherrypy.log.error("Waiting for couchdb.")
        time.sleep(1.0)

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
      cherrypy.log.error("%s cached %s objects from %s records, sequence %s." % (self._name, len(self._storage), len(changes["results"]), self._last_seq))

    # Keep the cache up-to-date.
    while cherrypy.engine.state == cherrypy.engine.states.STARTED:
      for change in database.changes(filter=self._filter, feed="continuous", include_docs=True, since=self._last_seq, timeout=5000):
        with self._lock:
          #cherrypy.log.error("%s change %s." % (self._name, change))
          if "last_seq" in change:
            self._last_seq = change["last_seq"]
          elif "deleted" in change:
            self._last_seq = change["seq"]
            if change["id"] in self._storage:
              del self._storage[change["id"]]
          else:
            self._last_seq = change["seq"]
            self._storage[change["id"]] = dict(id=change["id"], doc=change["doc"])

  def current(self):
    with self._lock:
      return self._last_seq, self._storage.values()

class Database:
  """Wraps a :class:`couchdb.client.Database` to convert CouchDB exceptions into CherryPy exceptions."""
  def __init__(self, database):
    self._database = database

  def __getitem__(self, *arguments, **keywords):
    return self._database.__getitem__(*arguments, **keywords)

  def changes(self, *arguments, **keywords):
    return self._database.changes(*arguments, **keywords)

  def delete(self, *arguments, **keywords):
    return self._database.delete(*arguments, **keywords)

  def get_attachment(self, *arguments, **keywords):
    return self._database.get_attachment(*arguments, **keywords)

  def put_attachment(self, *arguments, **keywords):
    return self._database.put_attachment(*arguments, **keywords)

  def save(self, *arguments, **keywords):
    try:
      return self._database.save(*arguments, **keywords)
    except couchdb.http.ServerError as e:
      raise cherrypy.HTTPError("%s %s" % (e.message[0], e.message[1][1]))

  def view(self, *arguments, **keywords):
    return self._database.view(*arguments, **keywords)

  def scan(self, path, **keywords):
    for row in self.view(path, include_docs=True, **keywords):
      document = row["doc"]
      yield document

  def get(self, type, id):
    try:
      document = self[id]
    except couchdb.client.http.ResourceNotFound:
      raise cherrypy.HTTPError(404)
    if document["type"] != type:
      raise cherrypy.HTTPError(404)
    return document

  def write_file(self, document, content, content_type):
    fid = uuid.uuid4().hex
    self.put_attachment(document, content, filename=fid, content_type=content_type)
    return fid

def connect():
  """Connect to a CouchDB database.

  Returns
  -------
  database : :class:`slycat.web.server.database.couchdb.Database`
  """
  server = couchdb.client.Server(url=cherrypy.tree.apps[""].config["slycat"]["couchdb-host"])
  database = Database(server[cherrypy.tree.apps[""].config["slycat"]["couchdb-database"]])
  return database
