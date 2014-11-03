# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

"""Slycat uses `CouchDB <http://couchdb.apache.org>`_ as its primary storage
for projects, models, bookmarks, metadata, and small model artficats.  For
large model artifacts such as :mod:`darrays<slycat.darray>`, the CouchDB
database stores links to HDF5 files stored on disk.
"""

from __future__ import absolute_import

import cherrypy
import couchdb.client
import threading
import time
import uuid

class Monitor:
  """Monitor database changes in a separate thread.

  Uses a CouchDB continuous changes feed, and notifies
  observers using a condition variable.
  """
  def __init__(self, name, filter):
    self._filter = filter
    self._revision = 0
    self._changed = threading.Condition()
    self._thread = threading.Thread(name=name, target=self._run)
    self._thread.daemon = True
    self._thread.start()

  @property
  def revision(self):
    """Current database revision.

    The database revision number is a monotonically increasing integer
    that is incremented whenever the database contents change (documents
    are created, modified, or deleted).
    """
    return self._revision

  @property
  def changed(self):
    """Condition variable that notifies all watchers when the database changes.
    """
    return self._changed

  def _run(self):
    database = connect()
    id_cache = set()

    # Initialize the cache ...
    changes = database.changes(filter=self._filter)
    with self._changed:
      self._revision = changes["last_seq"]
      for change in changes["results"]:
        if "deleted" in change:
          if change["id"] in id_cache:
            del id_cache[change["id"]]
        else:
          id_cache.add(change["id"])

    cherrypy.log.error("Initialized id cache to revision %s, loaded %s ids." % (self._revision, len(id_cache)))

    # Update the cache when the database changes ...
    while True:
      try:
        for change in database.changes(filter=self._filter, feed="continuous", since=self._revision):
          with self._changed:
            if "deleted" in change:
              if change["id"] in id_cache:
                self._revision = change["seq"]
                self._changed.notify_all()
            elif "seq" in change:
              id_cache.add(change["id"])
              self._revision = change["seq"]
              self._changed.notify_all()
      except Exception as e:
        cherrypy.log.error("%s" % e)
        cherrypy.log.error("Waiting to reconnect to database.")
        time.sleep(1.0)
        database = connect()

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
