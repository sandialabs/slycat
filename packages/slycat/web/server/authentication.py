# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract 
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government 
# retains certain rights in this software.

import cherrypy

def project_acl(project):
  """Extract ACL information from a project."""
  if "acl" not in project:
    cherrypy.log.error("Project missing ACL: %s" % project)
    return {"administrators":{}, "writers":{}, "readers":{}}
  return project["acl"]

def is_server_administrator():
  """Return True if the current request is from a server administrator."""
  return cherrypy.request.login in cherrypy.request.app.config["slycat"]["server-admins"]

def is_project_administrator(project):
  """Return True if the current request is from a project administrator."""
  return cherrypy.request.login in [administrator["user"] for administrator in project_acl(project)["administrators"]]

def is_project_writer(project):
  """Return True if the current request is from a project writer."""
  return cherrypy.request.login in [writer["user"] for writer in project_acl(project)["writers"]]

def is_project_reader(project):
  """Return True if the current request is from a project reader."""
  return cherrypy.request.login in [reader["user"] for reader in project_acl(project)["readers"]]

def test_server_administrator():
  """Return True if the current request has server administrator privileges."""
  if is_server_administrator():
    return True
  raise False

def test_project_administrator(project):
  """Return True if the current request has project administrator privileges."""
  if is_server_administrator():
    return True
  if is_project_administrator(project):
    return True
  return False

def test_project_writer(project):
  """Return True if the current request has project write privileges."""
  if is_server_administrator():
    return True
  if is_project_administrator(project):
    return True
  if is_project_writer(project):
    return True
  return False

def test_project_reader(project):
  """Return True if the current request has project read privileges."""
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
  """Raise an exception if the current request doesn't have server administrator privileges."""
  if not test_server_administrator():
    raise cherrypy.HTTPError(403)

def require_project_administrator(project):
  """Raise an exception if the current request doesn't have project administrator privileges."""
  if not test_project_administrator(project):
    raise cherrypy.HTTPError(403)

def require_project_writer(project):
  """Raise an exception if the current request doesn't have project write privileges."""
  if not test_project_writer(project):
    raise cherrypy.HTTPError(403)

def require_project_reader(project):
  """Raise an exception if the current request doesn't have project read privileges."""
  if not test_project_reader(project):
    raise cherrypy.HTTPError(403)

