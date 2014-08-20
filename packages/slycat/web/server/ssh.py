# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

"""Functions for managing cached remote ssh sessions.

Slycat makes extensive use of ssh to communicate with remote resources, such
as the high performance computing platforms used to generate ensembles.  This
module provides functionality to create cached remote ssh sessions that can
be used to retrieve data from remote hosts.  This functionality is used in
a variety of ways:

* Web clients can browse the filesystem of a remote host.
* Web clients can create a Slycat model using data stored on a remote host.
* Web clients can retrieve images from a remote host (an essential part of the :ref:`Parameter Image Model`).

When an ssh session is created, the connection to the remote host over ssh is
setup and a unique session identifier is returned.  Callers can use the session
id to retrieve the cached session, then use the contained ssh and sftp objects
to communicate with the remote host.  A "last access" time for each session is
maintained and updated whenever the cached session is accessed.  If a session
times-out (a threshold amount of time has elapsed since the last access) it is
automatically deleted, and subsequent use of the expired session id will fail.

Each session is bound to the IP address of the client that created it - only
the same client IP address is allowed to access the session.
"""

import cherrypy
import datetime
import hashlib
import paramiko
import socket
import threading
import time
import uuid

session_cache = {}
session_cache_lock = threading.Lock()
session_access_timeout = datetime.timedelta(minutes=15)

class Session(object):
  """Encapsulates an open ssh session to a remote host.

  Examples
  --------

  Calling threads must serialize access to the Session object.  To facilitate this,
  a Session is a context manager - callers should always use a `with statement` when
  accessing a session:

  >>> with slycat.web.server.ssh.get_session(sid) as session:
  ...   print session.username

  """
  def __init__(self, username, hostname, ssh, sftp):
    now = datetime.datetime.utcnow()
    self._created = now
    self._accessed = now
    self._username = username
    self._hostname = hostname
    self._ssh = ssh
    self._sftp = sftp
    self._client = cherrypy.request.remote.ip
    self._lock = threading.Lock()
  def __enter__(self):
    self._lock.__enter__()
    return self
  def __exit__(self, exc_type, exc_value, traceback):
    return self._lock.__exit__(exc_type, exc_value, traceback)
  @property
  def created(self):
    """Return the time the session was created."""
    return self._created
  @property
  def accessed(self):
    """Return the time the session was last accessed."""
    return self._accessed
  @property
  def username(self):
    """Return the username used to create the session."""
    return self._username
  @property
  def hostname(self):
    """Return the remote hostname accessed by the session."""
    return self._hostname
  @property
  def ssh(self):
    """Return a Paramiko ssh object."""
    return self._ssh
  @property
  def sftp(self):
    """Return a Paramiko sftp object."""
    return self._sftp
  @property
  def client(self):
    """Return the IP address of the client that created the session."""
    return self._client

def create_session(hostname, username, password):
  """Create a cached ssh session for the given host.

  Parameters
  ----------
  hostname : string
    Name of the remote host to connect via ssh
  username : string
    Username for ssh authentication
  password : string
    Password for ssh authentication

  Returns
  -------
  sid : string
    A unique session identifier.
  """
  _start_session_monitor()
  cherrypy.log.error("Creating ssh session for %s@%s from %s" % (username, hostname, cherrypy.request.remote.ip))

  try:
    sid = uuid.uuid4().hex
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(hostname=hostname, username=username, password=password)
    sftp = ssh.open_sftp()
    with session_cache_lock:
      session_cache[sid] = Session(username, hostname, ssh, sftp)
    return sid
  except paramiko.AuthenticationException as e:
    cherrypy.log.error("%s %s" % (type(e), str(e)))
    raise cherrypy.HTTPError("403 Remote authentication failed.")
  except Exception as e:
    cherrypy.log.error("%s %s" % (type(e), str(e)))
    raise cherrypy.HTTPError("500 Remote connection failed: %s" % str(e))

def get_session(sid):
  """Return a cached ssh session.

  If the session has timed-out or doesn't exist, raises a 404 exception.

  Parameters
  ----------
  sid : string
    Unique session identifier returned by :func:`slycat.web.server.ssh.create_session`.

  Returns
  -------
  session : :class:`slycat.web.server.ssh.Session`
    Session object that encapsulates the connection to a remote server.
  """
  with session_cache_lock:
    _expire_session(sid)

    # Only the originating client can access a session.
    if sid in session_cache:
      session = session_cache[sid]
      if cherrypy.request.remote.ip != session.client:
        cherrypy.log.error("Client %s attempted to access ssh session for %s@%s from %s" % (cherrypy.request.remote.ip, session.username, session.hostname, session.client))
        del session_cache[sid]
        raise cherrypy.HTTPError("404")

    if sid not in session_cache:
      raise cherrypy.HTTPError("404")

    session = session_cache[sid]
    session._accessed = datetime.datetime.utcnow()
    return session

def _expire_session(sid):
  """Test an existing session to see if it is expired.

  Assumes that the caller already holds session_cache_lock.
  """
  if sid in session_cache:
    now = datetime.datetime.utcnow()
    session = session_cache[sid]
    if now - session.accessed > session_access_timeout:
      cherrypy.log.error("Timing-out ssh session for %s@%s from %s" % (session.username, session.hostname, session.client))
      del session_cache[sid]

def _session_monitor():
  while True:
    with session_cache_lock:
      for sid in list(session_cache.keys()): # We make an explicit copy of the keys because we may be modifying the dict contents
        _expire_session(sid)
    time.sleep(5)

def _start_session_monitor():
  if _start_session_monitor.thread is None:
    cherrypy.log.error("Starting ssh session monitor.")
    _start_session_monitor.thread = threading.Thread(name="SSH Monitor", target=_session_monitor)
    _start_session_monitor.thread.daemon = True
    _start_session_monitor.thread.start()
_start_session_monitor.thread = None
