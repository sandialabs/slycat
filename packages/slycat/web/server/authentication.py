# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy

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

