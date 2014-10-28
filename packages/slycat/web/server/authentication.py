# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import datetime
import json

class ldap_authentication(cherrypy.Tool):
  """CherryPy tool that authenticates a user against an LDAP server."""
  def __init__(self):
    self._point = "on_start_resource"
    self._name = None
    self._priority = 50
    self.sessions = {}

  def callable(self, server, dn, timeout=datetime.timedelta(minutes=5), realm="Slycat"):
    if cherrypy.request.scheme != "https":
      raise cherrypy.HTTPError("400 SSL connection required.")

    if "slycatauth" in cherrypy.request.cookie:
      session = cherrypy.request.cookie["slycatauth"].value
      if session in self.sessions:
        started = self.sessions[session]["started"]
        if datetime.datetime.utcnow() - started > timeout:
          del self.sessions[session]
        else:
          user = self.sessions[session]["user"]
          entry = self.sessions[session]["entry"]
          cherrypy.request.security = { "user" : user, "name" : entry["cn"][0], "roles" : entry["memberOf"] }
          # Ensure that the user is logged correctly ...
          cherrypy.request.login = user
          return
      else:
        # Expired or forged cookie
        cherrypy.log.error("%s - -: expired/unknown session." % (cherrypy.request.remote.name or cherrypy.request.remote.ip))
        pass

    def checkpassword(realm, username, password):
      cherrypy.log.error("%s - %s: authenticating LDAP password." % (cherrypy.request.remote.name or cherrypy.request.remote.ip, username))
      try:
        import ldap
        ldap.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_NEVER)
        connection = ldap.initialize(server)
        connection.simple_bind_s(dn % username, password)
        entry = connection.search_s(dn % username, ldap.SCOPE_BASE)[0][1]

        import uuid
        session = uuid.uuid4().hex
        self.sessions[session] = { "started" : datetime.datetime.utcnow(), "user" : username, "entry" : entry }

        cherrypy.request.security = { "user" : username, "name" : entry["cn"][0], "roles" : entry["memberOf"] }

        cherrypy.response.cookie["slycatauth"] = session
        cherrypy.response.cookie["slycatauth"]["path"] = "/"
        cherrypy.response.cookie["slycatauth"]["secure"] = 1
        cherrypy.response.cookie["slycatauth"]["httponly"] = 1
        return True
      except Exception as e:
        cherrypy.log.error("%s - %s: authentication failed: %s." % (cherrypy.request.remote.name or cherrypy.request.remote.ip, username, e))
        return False
    cherrypy.lib.auth_basic.basic_auth(realm, checkpassword)
cherrypy.tools.slycat_ldap_authentication = ldap_authentication()

def project_acl(project):
  """Extracts ACL information from a project."""
  if "acl" not in project:
    cherrypy.log.error("Project missing ACL: %s" % project)
    return {"administrators":{}, "writers":{}, "readers":{}}
  return project["acl"]

def is_server_administrator():
  return cherrypy.request.security["user"] in cherrypy.request.app.config["slycat"]["server-admins"]

def is_project_administrator(project):
  return cherrypy.request.security["user"] in [administrator["user"] for administrator in project_acl(project)["administrators"]]

def is_project_writer(project):
  return cherrypy.request.security["user"] in [writer["user"] for writer in project_acl(project)["writers"]]

def is_project_reader(project):
  return cherrypy.request.security["user"] in [reader["user"] for reader in project_acl(project)["readers"]]

def is_worker_creator(worker):
  return cherrypy.request.security["user"] == worker.status["creator"]

def test_server_administrator():
  """Tests to see that the current request is from a user with server administrator privileges."""
  if is_server_administrator():
    return True
  raise False

def test_project_administrator(project):
  """Tests to see that the current request is from a user with administrator privileges."""
  if is_server_administrator():
    return True
  if is_project_administrator(project):
    return True
  return False

def test_project_writer(project):
  """Tests to see that the current request is from a user with write privileges."""
  if is_server_administrator():
    return True
  if is_project_administrator(project):
    return True
  if is_project_writer(project):
    return True
  return False

def test_project_reader(project):
  """Tests to see that the current request is from a user with read privileges."""
  if is_server_administrator():
    return True
  if is_project_administrator(project):
    return True
  if is_project_writer(project):
    return True
  if is_project_reader(project):
    return True
  return False

def require_server_administrator():
  """Tests to see that the current request is from a user with server administrator privileges."""
  if not test_server_administrator():
    raise cherrypy.HTTPError(403)

def require_project_administrator(project):
  """Tests to see that the current request is from a user with administrator privileges."""
  if not test_project_administrator(project):
    raise cherrypy.HTTPError(403)

def require_project_writer(project):
  """Tests to see that the current request is from a user with write privileges."""
  if not test_project_writer(project):
    raise cherrypy.HTTPError(403)

def require_project_reader(project):
  """Tests to see that the current request is from a user with read privileges."""
  if not test_project_reader(project):
    raise cherrypy.HTTPError(403)

def require_worker_creator(worker):
  """Tests to see that the current request is from the user that created the given worker."""
  if is_server_administrator():
    return
  if is_worker_creator(worker):
    return
  raise cherrypy.HTTPError(403)

