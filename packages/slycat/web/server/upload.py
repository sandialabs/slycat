# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

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
import stat
import threading
import time
import uuid


session_cache = {}
session_cache_lock = threading.Lock()
parsing_locks = {}

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
  def __init__(self, uid, client, mid, input, parser, aids, kwargs):
    now = datetime.datetime.utcnow()
    self._uid = uid
    self._client = client
    self._mid = mid
    self._input = input
    self._parser = parser
    self._aids = aids
    self._kwargs = kwargs
    self._created = now
    self._accessed = now
    self._received = set()
    self._parsing_thread = None
    self._download_thread = None
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

  def put_remote_upload_file_part(self, sid, fid, pid, file_path):
    """used to download a remote ssh file to the server via a thread"""
    try:
      self._download_thread = threading.Thread(name="downlading remote file", target=Session._download_file_part, args=(self, sid, fid, pid, file_path, cherrypy.request.headers.get("x-forwarded-for")))
      self._download_thread.start()
    except Exception as e:
      cherrypy.log.error("e: %s" % str(e))

  def _download_file_part(self, sid, fid, pid, file_path, calling_client):
    data = None
    with slycat.web.server.remote.get_session(sid, calling_client) as session:
        filename = "%s@%s:%s" % (session.username, session.hostname, file_path)
        if stat.S_ISDIR(session.sftp.stat(file_path).st_mode):
            cherrypy.log.error("slycat.web.server.handlers.py put_upload_file_part",
                                    "cherrypy.HTTPError 400 cannot load directory %s." % filename)
            raise cherrypy.HTTPError("400 Cannot load directory %s." % filename)
        try:
            data = session.sftp.file(file_path).read()
        except Exception as e:
            cherrypy.log.error("e: %s" % str(e))
    self.put_upload_file_part(fid, pid, data)

  def put_upload_file_part(self, fid, pid, data):
    if self._parsing_thread is not None:
      raise cherrypy.HTTPError("409 Upload already finished.")

    storage = path(self._uid, fid, pid)
    if not os.path.exists(os.path.dirname(storage)):
      os.makedirs(os.path.dirname(storage))
    # cherrypy.log.error("Storing upload file part %s" % storage)
    with open(storage, "wb") as file:
      file.write(data)
    self._received.add((fid, pid))

  def post_upload_finished(self, uploaded, useProjectData):
    """
    checks for missing and excess files, if neither are found moves on to
    finishing the upload and parsing the uploaded item.
    :param uploaded: description of uploaded parts of the file
    :return:
      if missing:
        {"missing": missing}
      if excess:
        {"excess": excess}
      if moving to finished state
        "202 Upload session finished."
      if previously finished
        "409 Upload already finished."
    """
    if self._parsing_thread is not None:
      raise cherrypy.HTTPError("409 Upload already finished.")
    if self._download_thread is not None and self._download_thread.is_alive():
      raise cherrypy.HTTPError("423 server is busy downloading file.")

    uploaded = {(fid, pid) for fid in range(len(uploaded)) for pid in range(uploaded[fid])}
    missing = [part for part in uploaded if part not in self._received]
    excess = [part for part in self._received if part not in uploaded]
    self.useProjectData = useProjectData

    if missing:
      cherrypy.response.status = "400 Upload incomplete."
      return {"missing": missing}

    if excess:
      cherrypy.response.status = "400 Client confused."
      return {"excess": excess}

    self._parsing_thread = threading.Thread(name="Upload parsing", target=Session._parse_uploads, args=[self])
    self._parsing_thread.start()

    cherrypy.response.status = "202 Upload session finished."

  def _parse_uploads(self):
    """
    calls the parse function specified by the registered parser
    :return: not used
    """
    cherrypy.log.error("Upload parsing started.")

    if self._mid not in parsing_locks:
      parsing_locks[self._mid] = threading.Lock()

    with parsing_locks[self._mid]:
      #cherrypy.log.error("got lock: %s" % self._mid)
      database = slycat.web.server.database.couchdb.connect()
      model = database.get("model", self._mid)

      def numeric_order(x):
        """Files and file parts must be loaded in numeric, not lexicographical, order."""
        return int(x.split("-")[-1])

      # we no longer support multi file uploads 
      # TODO: need to decide if we should remove this or refactor for multi files again
      files = []
      storage = path(self._uid)
      for file_dir in sorted(glob.glob(os.path.join(storage, "file-*")), key=numeric_order):
        # cherrypy.log.error("Assembling %s" % file_dir)

        is_bin_file = False
        file_parts = []

        for file_part in sorted(glob.glob(os.path.join(file_dir, "part-*")), key=numeric_order):
          # cherrypy.log.error(" Loading %s" % file_part)

          # is this a text file?
          if is_bin_file == False:

            # try to open as text file
            try:
              with open(file_part, "r") as f:
                file_parts.append(f.read())

            # not a text file, open as binary
            except UnicodeDecodeError:
              is_bin_file = True

          # is it a binary file?
          if is_bin_file == True:
            with open(file_part, "rb") as f:
              file_parts.append(f.read())

        # join file parts to make full file
        if is_bin_file == False:
          file = ''.join(file_parts)
        else:
          file = b''.join(file_parts)

        files.append(file)

      try:
      # adding this check for backwards compatibility 
      # new way self._aids[0] is the file name being added to the model and hdf5
      # self._aids[1] is the name of the file being pushed to the project_data data object
        if len(self._aids) > 1:
          if '.h5' in self._aids[1] or '.hdf5' in self._aids[1]:
            slycat.web.server.plugin.manager.parsers[self._parser]["parse"](database, model, self._input,
                                                                files, self._aids, **self._kwargs)
          elif isinstance(self._aids[0], list):
            slycat.web.server.plugin.manager.parsers[self._parser]["parse"](database, model, self._input,
                                                                            files, self._aids[0], **self._kwargs)
        else:
          slycat.web.server.plugin.manager.parsers[self._parser]["parse"](database, model, self._input,
                                                                            files, self._aids, **self._kwargs)
        if model["model-type"] == "parameter-image" and self.useProjectData == True and '.h5' not in self._aids[1] and '.hdf5' not in self._aids[1]:
          # Use project data
          slycat.web.server.handlers.create_project_data(self._mid, self._aids, files)
      except Exception as e:
        cherrypy.log.error("Exception parsing posted files: %s" % e)
        import traceback
        cherrypy.log.error(traceback.format_exc())
      cherrypy.log.error("Upload parsing finished.")

  def close(self):
    """
    destroys the temp files made by an upload session
    :return: 
    """
    if self._parsing_thread is not None and self._parsing_thread.is_alive():
      # Commenting out the error email since it seems like a frequent one as well...
      # cherrypy.log.error("slycat.web.server.upload.py close", "cherrypy.HTTPError 409 parsing in progress.")
      raise cherrypy.HTTPError("409 Parsing in progress.")

    storage = path(self._uid)
    cherrypy.log.error("Destroying temporary upload storage %s" % storage)
    if os.path.exists(storage):
      shutil.rmtree(storage)

def create_session(mid, input, parser, aids, kwargs):
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
    session_cache[uid] = Session(uid, client, mid, input, parser, aids, kwargs)
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
        cherrypy.log.error("slycat.web.server.upload.py get_session", "cherrypy.HTTPError 404 client %s attempted to access upload session from %s" % (client, session.client))
        raise cherrypy.HTTPError("404")

    if uid not in session_cache:
      cherrypy.log.error("slycat.web.server.upload.py get_session", "cherrypy.HTTPError 404 uid is not in session_cache")
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
    #cherrypy.log.error("Upload session cleanup worker running.")
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
    #cherrypy.log.error("Starting upload session cleanup worker.")
    _start_session_cleanup_worker.thread = threading.Thread(name="Upload Monitor", target=_session_monitor)
    _start_session_cleanup_worker.thread.daemon = True
    _start_session_cleanup_worker.thread.start()
_start_session_cleanup_worker.thread = None

