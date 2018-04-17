# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

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
import slycat.email

db_lock = threading.Lock()
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
      slycat.email.send_error("slycat.web.server.database.couchdb.py save", "%s %s" % (e.message[0], e.message[1][1]))
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
      slycat.email.send_error("slycat.web.server.database.couchdb.py get", "cherrypy.HTTPError 404 document type %s is different than input type: %s" % (document["type"], type))
      raise cherrypy.HTTPError(404)
    return document

  def write_file(self, document, content, content_type):
    fid = uuid.uuid4().hex
    self.put_attachment(document, content, filename=fid, content_type=content_type)
    return fid

  def __repr__(self):
    """
    adding this so we can use the cache decorator
    :return:
    """
    return "<slycat.web.server.database.couchdb.Database instance>"

def connect():
  """Connect to a CouchDB database.

  Returns
  -------
  database : :class:`slycat.web.server.database.couchdb.Database`
  """
  server = couchdb.client.Server(url=cherrypy.tree.apps[""].config["slycat"]["couchdb-host"])
  database = Database(server[cherrypy.tree.apps[""].config["slycat"]["couchdb-database"]])
  return database
