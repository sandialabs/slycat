# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def register_slycat_plugin(context):
  import cherrypy
  def authenticate():
    """A do-nothing authentication plugin."""
    cherrypy.request.security = { "user" : "", "name" : "",  "roles": [] }

  context.register_tool("slycat-disable-authentication", "on_start_resource", authenticate)
