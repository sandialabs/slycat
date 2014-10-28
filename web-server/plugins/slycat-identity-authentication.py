# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def register_slycat_plugin(context):
  import cherrypy
  def authenticate(realm, blacklist):
    """Use basic authentication to allow any user, so long as their username
    and password are the same, and their username isn't part of a blacklist.
    Obviously, this is suitable only for testing."""
    def checkpassword(realm, username, password):
      return username and password and username == password and username not in blacklist
    cherrypy.lib.auth_basic.basic_auth(realm, checkpassword)
    cherrypy.request.security = { "user" : cherrypy.request.login, "name" : cherrypy.request.login,  "roles": [] }

  context.register_tool("slycat-identity-authentication", "on_start_resource", authenticate)
