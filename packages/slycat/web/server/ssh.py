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

def connect(hostname, username, password):
  """Create a standard SSH connection."""
  try:
    connection = paramiko.SSHClient()
    connection.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    connection.connect(hostname=hostname, username=username, password=password)
    return connection
  except paramiko.AuthenticationException:
    raise cherrypy.HTTPError("403 Remote authentication failed.")
  except socket.gaierror as e:
    cherrypy.log.error("%s %s" % (type(e), e))
    raise cherrypy.HTTPError("400 %s" % e.strerror)
  except Exception as e:
    import traceback
    cherrypy.log.error("%s %s" % (type(e), e))
    raise cherrypy.HTTPError("500 Remote connection failed.")

session_lock = threading.Lock()
session_cache = {}
session_access_timeout = datetime.timedelta(minutes=5)

def create_session(client, hostname, username, password):
  """Create a cached ssh + sftp session for the given host."""
  start_session_monitor()
  cherrypy.log.error("Creating ssh session for %s@%s from %s" % (username, hostname, client))
  ssh = connect(hostname, username, password)
  sftp = ssh.open_sftp()
  sid = uuid.uuid4().hex
  now = datetime.datetime.utcnow()
  session = {"started":now, "accessed":now, "ssh":ssh, "sftp":sftp, "username":username, "hostname":hostname, "client":client}
  with session_lock:
    session_cache[sid] = session
  return sid

def expire_session(sid):
  """Test an existing session to see if it is expired.

  Assumes that the caller already holds the session lock.
  """
  if sid in session_cache:
    now = datetime.datetime.utcnow()
    session = session_cache[sid]
    if now - session["accessed"] > session_access_timeout:
      cherrypy.log.error("Timing-out ssh session for %s@%s from %s" % (session["username"], session["hostname"], session["client"]))
      del session_cache[sid]

def validate_client(client, sid):
  """Test an existing session to verify that it matches the given client.

  Assumes that the caller already holds the session lock."""
  if sid in session_cache:
    session = session_cache[sid]
    if client != session["client"]:
      cherrypy.log.error("Client %s attempted to access ssh session for %s@%s from %s" % (client, session["username"], session["hostname"], session["client"]))
      del session_cache[sid]
      raise cherrypy.HTTPError("403 Forbidden.")

def get_session(client, sid):
  """Returns a cached ssh + sftp session."""
  with session_lock:
    expire_session(sid)
    validate_client(client, sid)
    if sid not in session_cache:
      raise cherrypy.HTTPError("401 Unauthorized")
    session = session_cache[sid]
    session["accessed"] = datetime.datetime.utcnow()
    return session

def session_monitor():
  while True:
    with session_lock:
      for sid in list(session_cache.keys()): # We make an explicit copy of the keys because we may be modifying the dict contents
        expire_session(sid)
    time.sleep(5)

def start_session_monitor():
  if start_session_monitor.thread is None:
    cherrypy.log.error("Starting ssh session monitor.")
    start_session_monitor.thread = threading.Thread(name="SSH Monitor", target=session_monitor)
    start_session_monitor.thread.daemon = True
    start_session_monitor.thread.start()
start_session_monitor.thread = None
