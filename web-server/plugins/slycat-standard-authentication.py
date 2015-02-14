# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def register_slycat_plugin(context):
  from cherrypy._cpcompat import base64_decode
  import binascii
  import cherrypy
  import datetime
  import functools
  import slycat.web.server.plugin

  def authenticate(realm, session_timeout=datetime.timedelta(minutes=5)):
    # Sanity-check our inputs.
    if '"' in realm:
      raise ValueError("Realm cannot contain the \" (quote) character.")
    if session_timeout.total_seconds() < 0:
      raise ValueError("Session timeout cannot be negative.")

    # Require a secure connection.
    if not (cherrypy.request.scheme == "https" or cherrypy.request.headers.get("x-forwarded-proto") == "https"):
      raise cherrypy.HTTPError("403 Secure connection required.")

    # See if the client already has a valid session.
    if "slycatauth" in cherrypy.request.cookie:
      session = cherrypy.request.cookie["slycatauth"].value
      if session in authenticate.sessions:
        started = authenticate.sessions[session]["started"]
        if datetime.datetime.utcnow() - started > session_timeout:
          del authenticate.sessions[session]
        else:
          # Ensure that the user is logged correctly ...
          cherrypy.request.login = authenticate.sessions[session]["username"]
          return
      else:
        # Expired or forged cookie
        cherrypy.log.error("@%s: expired/unknown session." % (cherrypy.request.remote.name or cherrypy.request.remote.ip))

    # If the client hasn't authenticated, tell them to do so.
    authorization = cherrypy.request.headers.get("authorization")
    if authorization is None:
      cherrypy.response.headers["www-authenticate"] = "Basic realm=\"%s\"" % realm
      raise cherrypy.HTTPError(401, "Authentication required.")

    # Parse the client's authentication response.
    try:
      scheme, params = authorization.split(" ", 1)
    except:
      raise cherrypy.HTTPError(400)
    if scheme.lower() != "basic":
      raise cherrypy.HTTPError(400)
    try:
      username, password = base64_decode(params).split(":", 1)
    except:
      raise cherrypy.HTTPError(400)

    cherrypy.log.error("%s@%s: Checking password." % (username, cherrypy.request.remote.name or cherrypy.request.remote.ip))

    if authenticate.password_check is None:
      if "password-check" not in cherrypy.request.app.config["slycat"]:
        raise cherrypy.HTTPError("500 No password check configured.")
      plugin = cherrypy.request.app.config["slycat"]["password-check"]["plugin"]
      args = cherrypy.request.app.config["slycat"]["password-check"].get("args", [])
      kwargs = cherrypy.request.app.config["slycat"]["password-check"].get("kwargs", {})
      if plugin not in slycat.web.server.plugin.manager.password_checks.keys():
        raise cherrypy.HTTPError("500 No password check plugin found.")
      authenticate.password_check = functools.partial(slycat.web.server.plugin.manager.password_checks[plugin], *args, **kwargs)

    if authenticate.password_check(realm, username, password):
      import uuid
      session = uuid.uuid4().hex
      authenticate.sessions[session] = { "started" : datetime.datetime.utcnow(), "username" : username }

      cherrypy.response.cookie["slycatauth"] = session
      cherrypy.response.cookie["slycatauth"]["path"] = "/"
      cherrypy.response.cookie["slycatauth"]["secure"] = 1
      cherrypy.response.cookie["slycatauth"]["httponly"] = 1
      cherrypy.request.login = username
      cherrypy.log.error("%s@%s: Password check succeeded." % (username, cherrypy.request.remote.name or cherrypy.request.remote.ip))
      return  # successful authentication

    # Authentication failed, tell the client to try again.
    cherrypy.log.error("%s@%s: Password check failed." % (username, cherrypy.request.remote.name or cherrypy.request.remote.ip))
    cherrypy.response.headers["www-authenticate"] = "Basic realm=\"%s\"" % realm
    raise cherrypy.HTTPError(401, "Authentication required.")


#    def checkpassword(realm, username, password):
#      try:
#        dn = user_dn % username
#
#        # Check the username and password.
#        import ldap
#        ldap.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_NEVER)
#        ldap.set_option(ldap.OPT_NETWORK_TIMEOUT, network_timeout.total_seconds())
#        connection = ldap.initialize(server)
#        connection.simple_bind_s(dn, password)
#
#        # Apply (optional) authentication rules.
#        if rules is not None:
#          deny = None
#          for operation, category, members in rules:
#            if operation not in ["allow", "deny"]:
#              raise Exception("Unknown operation: %s." % operation)
#            if category not in ["users", "groups"]:
#              raise Exception("Unknown category: %s." % category)
#
#            operation_default = True if operation == "allow" else False
#            operation_deny = False if operation == "allow" else True
#
#            if deny is None:
#              deny = operation_default
#            if category == "users":
#              if username in members:
#                deny = operation_deny
#            elif category == "groups":
#              for groupname in members:
#                group = connection.search_s(group_dn % groupname, ldap.SCOPE_BASE)[0][1]
#                if dn.lower() in [member.lower() for member in group["uniqueMember"]]:
#                  deny = operation_deny
#                  break
#
#          if deny:
#            raise Exception("User denied by authentication rules.")
#
#      except Exception as e:
#        return False
#

  authenticate.password_check = None
  authenticate.sessions = {}

  context.register_tool("slycat-standard-authentication", "on_start_resource", authenticate)
