# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import datetime
import hashlib
import slycat.web.server.ssh
import threading

def ssh_session(hostname, username, password):
  """Returns a cached ssh + sftp session to the given host."""
  key = (host, username, hashlib.sha1(password).hexdigest())
  with ssh_session.lock:
    if key in ssh_session.cache and datetime.datetime.utcnow() - ssh_session.cache[key]["started"] > ssh_session.timeout:
      cherrypy.log.error("Timing-out ssh session for host %s user %s" % (host, username))
      del ssh_session.cache[key]
    if key not in ssh_session.cache:
      cherrypy.log.error("Creating ssh session for host %s user %s" % (host, username))
      ssh = slycat.web.server.ssh.connect(hostname, username, password)
      sftp = ssh.open_sftp()
      session = {"started" : datetime.datetime.utcnow(), "ssh" : ssh, "sftp" : sftp}
      ssh_session.cache[key] = session
    return ssh_session.cache[key]
ssh_session.lock = threading.Lock()
ssh_session.cache = {}
ssh_session.timeout = datetime.timedelta(minutes=5)
