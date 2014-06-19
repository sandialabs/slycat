# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import datetime
import hashlib
import paramiko
import socket
import threading

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


def session(hostname, username, password):
  """Returns a cached ssh + sftp session to the given host."""
  key = (hostname, username, hashlib.sha1(password).hexdigest())
  with session.lock:
    if key in session.cache and datetime.datetime.utcnow() - session.cache[key]["started"] > session.timeout:
      cherrypy.log.error("Timing-out ssh session for %s@%s" % (username, hostname))
      del session.cache[key]
    if key not in session.cache:
      cherrypy.log.error("Creating ssh session for %s@%s" % (username, hostname))
      ssh = connect(hostname, username, password)
      sftp = ssh.open_sftp()
      new_session = {"started" : datetime.datetime.utcnow(), "ssh" : ssh, "sftp" : sftp}
      session.cache[key] = new_session
    return session.cache[key]
session.lock = threading.Lock()
session.cache = {}
session.timeout = datetime.timedelta(minutes=5)
