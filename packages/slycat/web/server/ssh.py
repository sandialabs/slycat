# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import paramiko
import socket

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
