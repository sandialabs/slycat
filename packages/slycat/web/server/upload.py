# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

"""Functions for managing upload sessions.

An upload session is used to incrementally upload (potentially large) data
before it is parsed and stored in the form of model artifacts.  When an
upload session is created, a new id is generated and a storage location is
created on the filesystem.  The client uses the session id to upload one-to-many
files, each of which may be split in one-to-many parts - splitting files into
parts allows clients to incrementally upload files that might otherwise exceed
request body limits.  Once the client has completed uploading file data, it
notifies the server, and includes a list of part-counts for each file it
uploaded.  This gives the server a chance to validate that it received every
part of every file that the client sent.  Assuming all went well, the file
parts are consolidated into whole files that are passed to a parser plugin
for parsing and storage in a model.  Once parsing is complete, the client
deletes the session, which releases all temporary storage used by the session.
The client may also opt to delete the session before uploading is complete,
cancelling the entire operation.

A "last access" time for each session is maintained and updated whenever the
session is accessed.  If a session times-out (a threshold amount of time has
elapsed since the last access) it is automatically deleted, and subsequent use
of the expired session id will fail.

Each session is bound to the IP address of the client that created it - only
the same client IP address is allowed to access the session.
"""

import cherrypy
import datetime
import glob
import os
import shutil
import slycat.web.server.authentication
import slycat.web.server.database
import threading
import time
import uuid


session_cache = {}
session_cache_lock = threading.Lock()

def root():
  if root.path is None:
    root.path = cherrypy.tree.apps[""].config["slycat-web-server"]["upload-store"]
  return root.path
root.path = None

def path(uid, fid=None, pid=None):
  result = os.path.join(root(), uid)
  if fid is not None:
    result = os.path.join(result, "file-%s" % fid)
  if pid is not None:
    result = os.path.join(result, "part-%s" % pid)
  return result

class Session(object):
  """Encapsulates an upload session.

  Examples
  --------

  Calling threads must serialize access to the Session object.  To facilitate this,
  a Session is a context manager - callers should always use a `with statement` when
  accessing a session:

  >>> with slycat.web.server.upload.get_session(uid) as session:
  ...   print session.username

  """
  def __init__(self, uid, client, mid, input, parser, aids):
    now = datetime.datetime.utcnow()
    self._uid = uid
    self._client = client
    self._mid = mid
    self._input = input
    self._parser = parser
    self._aids = aids
    self._received = set()
    self._created = now
    self._accessed = now
    self._lock = threading.Lock()

  def __enter__(self):
    self._lock.__enter__()
    return self

  def __exit__(self, exc_type, exc_value, traceback):
    return self._lock.__exit__(exc_type, exc_value, traceback)

  @property
  def client(self):
    """Return the IP address of the client that created the session."""
    return self._client

  @property
  def mid(self):
    """Return the model id that will store data uploaded during the session."""
    return self._mid

  @property
  def accessed(self):
    """Return the time the session was last accessed."""
    return self._accessed

  def put_upload_file_part(self, fid, pid, data):
    storage = path(self._uid, fid, pid)
    if not os.path.exists(os.path.dirname(storage)):
      os.makedirs(os.path.dirname(storage))
    cherrypy.log.error("Storing upload file part %s" % storage)
    with open(storage, "wb") as file:
      file.write(data)
    self._received.add((fid, pid))

  def post_upload_finished(self, uploaded):
    uploaded = {(fid, pid) for fid in range(len(uploaded)) for pid in range(uploaded[fid])}

    missing = [part for part in uploaded if part not in self._received]
    excess = [part for part in self._received if part not in uploaded]

    if missing:
      cherrypy.response.status = "400 Upload incomplete."
      return {"missing": missing}

    if excess:
      cherrypy.response.status = "400 Client confused."
      return {"excess": excess}

    cherrypy.response.status = "202 Upload session finished."

  def close(self):
    storage = path(self._uid)
    cherrypy.log.error("Destroying temporary upload storage %s" % storage)
    if os.path.exists(storage):
      shutil.rmtree(storage)

def create_session(mid, input, parser, aids):
  """Create a cached upload session for the given model.

  Parameters
  ----------
  mid : string
    ID of the model that will store data uploaded during the session.

  Returns
  -------
  uid : string
    A unique session identifier.
  """
  database = slycat.web.server.database.couchdb.connect()
  model = database.get("model", mid)
  project = database.get("project", model["project"])
  slycat.web.server.authentication.require_project_writer(project)

  _start_session_cleanup_worker()

  client = cherrypy.request.headers.get("x-forwarded-for")
  cherrypy.log.error("Creating upload session for %s" % (client))

  uid = uuid.uuid4().hex
  with session_cache_lock:
    session_cache[uid] = Session(uid, client, mid, input, parser, aids)
  return uid

def get_session(uid):
  """Return a cached upload session.

  If the session has timed-out or doesn't exist, raises a 404 exception.

  Parameters
  ----------
  uid : string
    Unique session identifier returned by :func:`slycat.web.server.upload.create_session`.

  Returns
  -------
  session : :class:`slycat.web.server.upload.Session`
    Session object that encapsulates the upload session.
  """
  client = cherrypy.request.headers.get("x-forwarded-for")

  with session_cache_lock:
    _expire_session(uid)

    if uid in session_cache:
      session = session_cache[uid]
      # Only the originating client can access a session.
      if client != session.client:
        cherrypy.log.error("Client %s attempted to access upload session from %s" % (client, session.client))
        del session_cache[uid]
        raise cherrypy.HTTPError("404")

    if uid not in session_cache:
      raise cherrypy.HTTPError("404")

    session = session_cache[uid]
    session._accessed = datetime.datetime.utcnow()
    return session

def delete_session(uid):
  """Delete a cached upload session.

  Parameters
  ----------
  uid : string, required
    Unique session identifier returned by :func:`slycat.web.server.upload.create_session`.
  """
  with session_cache_lock:
    if uid in session_cache:
      session = session_cache[uid]
      cherrypy.log.error("Deleting upload session for %s" % (session.client))
      session_cache[uid].close()
      del session_cache[uid]

def _expire_session(uid):
  """Test an existing session to see if it is expired.

  Assumes that the caller already holds session_cache_lock.
  """
  if uid in session_cache:
    now = datetime.datetime.utcnow()
    session = session_cache[uid]
    if now - session.accessed > slycat.web.server.config["slycat-web-server"]["upload-session-timeout"]:
      cherrypy.log.error("Timing-out upload session from %s" % (session.client))
      session_cache[uid].close()
      del session_cache[uid]

def _session_monitor():
  while True:
    cherrypy.log.error("Upload session cleanup worker running.")
    # Remove orphaned file storage (could happen if the server is restarted while an upload session is active).
    for storage in glob.glob(os.path.join(root(), "*")):
      if os.path.basename(storage) not in session_cache:
        cherrypy.log.error("Removing orphaned upload session storage %s" % storage)
        shutil.rmtree(storage)

    # Remove expired upload sessions.
    with session_cache_lock:
      for uid in list(session_cache.keys()): # We make an explicit copy of the keys because we may be modifying the dict contents
        _expire_session(uid)
    cherrypy.log.error("Upload session cleanup worker finished.")
    time.sleep(datetime.timedelta(minutes=15).total_seconds())

def _start_session_cleanup_worker():
  if _start_session_cleanup_worker.thread is None:
    cherrypy.log.error("Starting upload session cleanup worker.")
    _start_session_cleanup_worker.thread = threading.Thread(name="Upload Monitor", target=_session_monitor)
    _start_session_cleanup_worker.thread.daemon = True
    _start_session_cleanup_worker.thread.start()
_start_session_cleanup_worker.thread = None

