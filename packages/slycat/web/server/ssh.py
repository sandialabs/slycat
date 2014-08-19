# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

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
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(hostname=hostname, username=username, password=password)
    sftp = ssh.open_sftp()
    sid = uuid.uuid4().hex
    now = datetime.datetime.utcnow()
    session = {"started":now, "accessed":now, "ssh":ssh, "sftp":sftp, "username":username, "hostname":hostname, "client":cherrypy.request.remote.ip, "lock":threading.Lock()}
    with session_cache_lock:
      session_cache[sid] = session
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
  session : dict
    Dict containing session parameters, including Paramiko ssh and sftp
    objects, username, hostname, and a thread lock callers must use to
    synchronize access to the ssh and sftp objects..
  """
  with session_cache_lock:
    _expire_session(sid)

    # Only the originating client can access a session.
    if sid in session_cache:
      session = session_cache[sid]
      if cherrypy.request.remote.ip != session["client"]:
        cherrypy.log.error("Client %s attempted to access ssh session for %s@%s from %s" % (cherrypy.request.remote.ip, session["username"], session["hostname"], session["client"]))
        del session_cache[sid]
        raise cherrypy.HTTPError("404")

    if sid not in session_cache:
      raise cherrypy.HTTPError("404")

    session = session_cache[sid]
    session["accessed"] = datetime.datetime.utcnow()
    return session

def _expire_session(sid):
  """Test an existing session to see if it is expired.

  Assumes that the caller already holds session_cache_lock.
  """
  if sid in session_cache:
    now = datetime.datetime.utcnow()
    session = session_cache[sid]
    if now - session["accessed"] > session_access_timeout:
      cherrypy.log.error("Timing-out ssh session for %s@%s from %s" % (session["username"], session["hostname"], session["client"]))
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
