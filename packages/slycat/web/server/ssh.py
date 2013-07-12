# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import paramiko

def connect(hostname, username, password):
  """Create a standard SSH connection."""
  try:
    connection = paramiko.SSHClient()
    connection.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    connection.connect(hostname=hostname, username=username, password=password)
    return connection
  except paramiko.AuthenticationException:
    raise cherrypy.HTTPError("400 Remote authentication failed.")
  except Exception as e:
    import traceback
    cherrypy.log.error("%s" % traceback.print_exc())
    raise cherrypy.HTTPError("500 Remote connection failed.")
