# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def register_slycat_plugin(context):
  import cherrypy
  import datetime
  def authenticate(server, dn, timeout=datetime.timedelta(minutes=5), realm="Slycat"):
    """Implements LDAP user authentication."""
    if cherrypy.request.scheme != "https":
      raise cherrypy.HTTPError("400 SSL connection required.")

    if "slycatauth" in cherrypy.request.cookie:
      session = cherrypy.request.cookie["slycatauth"].value
      if session in authenticate.sessions:
        started = authenticate.sessions[session]["started"]
        if datetime.datetime.utcnow() - started > timeout:
          del authenticate.sessions[session]
        else:
          user = authenticate.sessions[session]["user"]
          entry = authenticate.sessions[session]["entry"]
          cherrypy.request.security = { "user" : user, "name" : entry["cn"][0], "roles" : entry.get("memberOf", []) }
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
        authenticate.sessions[session] = { "started" : datetime.datetime.utcnow(), "user" : username, "entry" : entry }

        cherrypy.request.security = { "user" : username, "name" : entry["cn"][0], "roles" : entry.get("memberOf", []) }

        cherrypy.response.cookie["slycatauth"] = session
        cherrypy.response.cookie["slycatauth"]["path"] = "/"
        cherrypy.response.cookie["slycatauth"]["secure"] = 1
        cherrypy.response.cookie["slycatauth"]["httponly"] = 1
        return True
      except Exception as e:
        cherrypy.log.error("%s - %s: authentication failed: %s." % (cherrypy.request.remote.name or cherrypy.request.remote.ip, username, e))
        return False
    cherrypy.lib.auth_basic.basic_auth(realm, checkpassword)
  authenticate.sessions = {}

  context.register_tool("slycat-ldap-authentication", "on_start_resource", authenticate)
