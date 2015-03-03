# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

"""Functions for managing cached remote ssh sessions.

Slycat makes extensive use of ssh and the `Slycat Agent` to access remote
resources located on the high performance computing platforms used to generate
ensembles.  This module provides functionality to create cached remote ssh /
agent sessions that can be used to retrieve data from remote hosts.  This
functionality is used in a variety of ways:

* Web clients can browse the filesystem of a remote host.
* Web clients can create a Slycat model using data stored on a remote host.
* Web clients can retrieve images on a remote host (an essential part of the :ref:`parameter-image-model`).
* Web clients can retrieve video compressed from still images on a remote host.

When a remote session is created, a connection to the remote host over ssh is
created, an agent is started (only if the required configuration is present),
and a unique session identifier is returned.  Callers use the session id to
retrieve the cached session and communicate with the remote host / agent.  A
"last access" time for each session is maintained and updated whenever the
cached session is accessed.  If a session times-out (a threshold amount of time
has elapsed since the last access) it is automatically deleted, and subsequent
use of the expired session id will fail.

Each session is bound to the IP address of the client that created it - only
the same client IP address is allowed to access the session.
"""

import cherrypy
import datetime
import hashlib
import json
import os
import paramiko
import socket
import stat
import threading
import time
import uuid

session_cache = {}
session_cache_lock = threading.Lock()
session_access_timeout = datetime.timedelta(minutes=15)

class Session(object):
  """Encapsulates an open session connected to a remote host.

  Examples
  --------

  Calling threads must serialize access to the Session object.  To facilitate this,
  a Session is a context manager - callers should always use a `with statement` when
  accessing a session:

  >>> with slycat.web.server.remote.get_session(sid) as session:
  ...   print session.username

  """
  def __init__(self, client, username, hostname, ssh, sftp, agent):
    now = datetime.datetime.utcnow()
    self._client = client
    self._username = username
    self._hostname = hostname
    self._ssh = ssh
    self._sftp = sftp
    self._agent = agent
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
  def username(self):
    """Return the username used to create the session."""
    return self._username
  @property
  def hostname(self):
    """Return the remote hostname accessed by the session."""
    return self._hostname
#  @property
#  def ssh(self):
#    """Return a Paramiko ssh object."""
#    return self._ssh
#  @property
#  def sftp(self):
#    """Return a Paramiko sftp object."""
#    return self._sftp
#  @property
#  def created(self):
#    """Return the time the session was created."""
#    return self._created
  @property
  def accessed(self):
    """Return the time the session was last accessed."""
    return self._accessed

  def browse(self, path, file_reject, file_allow, directory_reject, directory_allow):
    # Use the agent to browse.
    if self._agent is not None:
      command = {"action":"browse", "path":path}
      if file_reject is not None:
        command["file-reject"] = file_reject
      if file_allow is not None:
        command["file-allow"] = file_allow
      if directory_reject is not None:
        command["directory-reject"] = directory_reject
      if directory_allow is not None:
        command["directory-allow"] = directory_allow

      stdin, stdout, stderr = self._agent
      stdin.write("%s\n" % json.dumps(command))
      stdin.flush()
      return json.loads(stdout.readline())

    # Use sftp to browse.
    try:
      names = []
      sizes = []
      types = []
      mtimes = []

      for attribute in sorted(self._sftp.listdir_attr(path), key=lambda x: x.filename):
        filepath = os.path.join(path, attribute.filename)
        filetype = "d" if stat.S_ISDIR(attribute.st_mode) else "f"

        if filetype == "d":
          if directory_reject is not None and directory_reject.search(filepath) is not None:
            if directory_allow is None or directory_allow.search(filepath) is None:
              continue

        if filetype == "f":
          if file_reject is not None and file_reject.search(filepath) is not None:
            if file_allow is None or file_allow.search(filepath) is None:
              continue

        names.append(attribute.filename)
        sizes.append(attribute.st_size)
        types.append(filetype)
        mtimes.append(datetime.datetime.fromtimestamp(attribute.st_mtime).isoformat())

      response = {"path": path, "names": names, "sizes": sizes, "types": types, "mtimes": mtimes}
      return response
    except Exception as e:
      cherrypy.log.error("Error accessing %s: %s %s" % (path, type(e), str(e)))
      raise cherrypy.HTTPError("400 Remote access failed: %s" % str(e))

def create_session(hostname, username, password):
  """Create a cached remote session for the given host.

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
#  if hostname not in cherrypy.request.app.config["slycat"]["remote-hosts"]:
#    raise cherrypy.HTTPError("400 Unknown remote host.")
#  if "agent" not in cherrypy.request.app.config["slycat"]["remote-hosts"][hostname]:
#    raise cherrypy.HTTPError("400 No agent configured for remote host.")
#  if "command" not in cherrypy.request.app.config["slycat"]["remote-hosts"][hostname]["agent"]:
#    raise cherrypy.HTTPError("500 No startup command configured for remote agent.")

  _start_session_monitor()

  client = cherrypy.request.headers.get("x-forwarded-for")
  cherrypy.log.error("Creating remote session for %s@%s from %s" % (username, hostname, client))

  try:
    sid = uuid.uuid4().hex
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(hostname=hostname, username=username, password=password)
    sftp = ssh.open_sftp()

    # Optionally start an agent.
    agent = None
    remote_hosts = cherrypy.request.app.config["slycat"]["remote-hosts"]
    if hostname in remote_hosts and "agent" in remote_hosts[hostname] and "command" in remote_hosts[hostname]["agent"]:
      cherrypy.log.error("Starting agent executable for %s@%s with command: %s" % (username, hostname, remote_hosts[hostname]["agent"]["command"]))
      stdin, stdout, stderr = ssh.exec_command(remote_hosts[hostname]["agent"]["command"])
      # Handle catastrophic startup failures (the agent process failed to start).
      try:
        startup = json.loads(stdout.readline())
      except Exception as e:
        raise cherrypy.HTTPError("500 Agent startup failed: %s" % str(e))
      # Handle clean startup failures (the agent process started, but reported an error).
      if not startup["ok"]:
        raise cherrypy.HTTPError("500 Agent startup failed: %s" % startup["message"])
      agent = (stdin, stdout, stderr)

    with session_cache_lock:
      session_cache[sid] = Session(client, username, hostname, ssh, sftp, agent)
    return sid
  except cherrypy.HTTPError as e:
    cherrypy.log.error("Agent startup failed for %s@%s: %s" % (username, hostname, e.status))
    raise
  except paramiko.AuthenticationException as e:
    cherrypy.log.error("Authentication failed for %s@%s: %s" % (username, hostname, str(e)))
    raise cherrypy.HTTPError("403 Remote authentication failed.")
  except Exception as e:
    cherrypy.log.error("Unknown exception for %s@%s: %s %s" % (username, hostname, type(e), str(e)))
    raise cherrypy.HTTPError("500 Remote connection failed: %s" % str(e))

def get_session(sid):
  """Return a cached remote session.

  If the session has timed-out or doesn't exist, raises a 404 exception.

  Parameters
  ----------
  sid : string
    Unique session identifier returned by :func:`slycat.web.server.remote.create_session`.

  Returns
  -------
  session : :class:`slycat.web.server.remote.Session`
    Session object that encapsulates the connection to a remote host.
  """
  client = cherrypy.request.headers.get("x-forwarded-for")

  with session_cache_lock:
    _expire_session(sid)

    if sid in session_cache:
      session = session_cache[sid]
      # Only the originating client can access a session.
      if client != session.client:
        cherrypy.log.error("Client %s attempted to access remote session for %s@%s from %s" % (client, session.username, session.hostname, session.client))
        del session_cache[sid]
        raise cherrypy.HTTPError("404")

    if sid not in session_cache:
      raise cherrypy.HTTPError("404")

    session = session_cache[sid]
    session._accessed = datetime.datetime.utcnow()
    return session

def delete_session(sid):
  """Delete a cached remote session.

  Parameters
  ----------
  sid : string, required
    Unique session identifier returned by :func:`slycat.web.server.remote.create_session`.
  """
  with session_cache_lock:
    if sid in session_cache:
      session = session_cache[sid]
      cherrypy.log.error("Deleting remote session for %s@%s from %s" % (session.username, session.hostname, session.client))
      del session_cache[sid]

def _expire_session(sid):
  """Test an existing session to see if it is expired.

  Assumes that the caller already holds session_cache_lock.
  """
  if sid in session_cache:
    now = datetime.datetime.utcnow()
    session = session_cache[sid]
    if now - session.accessed > session_access_timeout:
      cherrypy.log.error("Timing-out remote session for %s@%s from %s" % (session.username, session.hostname, session.client))
      del session_cache[sid]

def _session_monitor():
  while True:
    with session_cache_lock:
      for sid in list(session_cache.keys()): # We make an explicit copy of the keys because we may be modifying the dict contents
        _expire_session(sid)
    time.sleep(5)

def _start_session_monitor():
  if _start_session_monitor.thread is None:
    cherrypy.log.error("Starting remote session monitor.")
    _start_session_monitor.thread = threading.Thread(name="SSH Monitor", target=_session_monitor)
    _start_session_monitor.thread.daemon = True
    _start_session_monitor.thread.start()
_start_session_monitor.thread = None
