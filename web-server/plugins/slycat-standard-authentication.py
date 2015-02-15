# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def register_slycat_plugin(context):
  from cherrypy._cpcompat import base64_decode
  import binascii
  import cherrypy
  import datetime
  import functools
  import slycat.web.server.database.couchdb
  import slycat.web.server.plugin
  import uuid

  def authenticate(realm, rules=None, session_timeout=datetime.timedelta(minutes=5)):
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
      sid = cherrypy.request.cookie["slycatauth"].value
      if sid in authenticate.sessions:
        started = authenticate.sessions[sid]["created"]
        if datetime.datetime.utcnow() - started > session_timeout:
          del authenticate.sessions[sid]
        else:
          # Ensure that the user is logged correctly ...
          cherrypy.request.login = authenticate.sessions[sid]["creator"]
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

    success, groups = authenticate.password_check(realm, username, password)
    if success:
      # Apply (optional) authentication rules.
      if rules is not None:
        deny = None
        for operation, category, members in rules:
          if operation not in ["allow", "deny"]:
            raise cherrypy.HTTPError("500 Unknown operation: %s." % operation)
          if category not in ["users", "groups"]:
            raise cherrypy.HTTPError("500 Unknown category: %s." % category)

          operation_default = True if operation == "allow" else False
          operation_deny = False if operation == "allow" else True

          if deny is None:
            deny = operation_default
          if category == "users":
            if username in members:
              deny = operation_deny
          elif category == "groups":
            for group in groups:
              if group in members:
                deny = operation_deny
                break

        if deny:
          raise cherrypy.HTTPError("403 User denied by authentication rules.")

      # Successful authentication, create a session and return.
      cherrypy.log.error("%s@%s: Password check succeeded." % (username, cherrypy.request.remote.name or cherrypy.request.remote.ip))

      sid = uuid.uuid4().hex
      session = {"created": datetime.datetime.utcnow(), "creator": username}
      database = slycat.web.server.database.couchdb.connect()
      database.save({"_id": sid, "type": "session", "created": session["created"].isoformat(), "creator": session["creator"]})

      authenticate.sessions[sid] = session

      cherrypy.response.cookie["slycatauth"] = sid
      cherrypy.response.cookie["slycatauth"]["path"] = "/"
      cherrypy.response.cookie["slycatauth"]["secure"] = 1
      cherrypy.response.cookie["slycatauth"]["httponly"] = 1
      cherrypy.request.login = username
      return  # successful authentication

    # Authentication failed, tell the client to try again.
    cherrypy.log.error("%s@%s: Password check failed." % (username, cherrypy.request.remote.name or cherrypy.request.remote.ip))
    cherrypy.response.headers["www-authenticate"] = "Basic realm=\"%s\"" % realm
    raise cherrypy.HTTPError(401, "Authentication required.")


  authenticate.password_check = None
  authenticate.sessions = {}

  context.register_tool("slycat-standard-authentication", "on_start_resource", authenticate)
