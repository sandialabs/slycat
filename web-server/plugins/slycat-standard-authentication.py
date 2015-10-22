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
  import slycat.email
  import uuid

  def authenticate(realm, rules=None):
    # Sanity-check our inputs.
    if '"' in realm:
      slycat.email.send_error("slycat-standard-authentication.py authenticate", "Realm cannot contain the \" (quote) character.")
      raise ValueError("Realm cannot contain the \" (quote) character.")

    # Require a secure connection.
    if not (cherrypy.request.scheme == "https" or cherrypy.request.headers.get("x-forwarded-proto") == "https"):
      slycat.email.send_error("slycat-standard-authentication.py authenticate", "cherrypy.HTTPError 403 secure connection required.")
      raise cherrypy.HTTPError("403 Secure connection required.")

    # Get the client ip, which might be forwarded by a proxy.
    remote_ip = cherrypy.request.headers.get("x-forwarded-for") if "x-forwarded-for" in cherrypy.request.headers else cherrypy.request.rem

    # See if the client already has a valid session.
    if "slycatauth" in cherrypy.request.cookie:
      sid = cherrypy.request.cookie["slycatauth"].value
      if sid in authenticate.sessions:
        started = authenticate.sessions[sid]["created"]
        if datetime.datetime.utcnow() - started > cherrypy.request.app.config["slycat"]["session-timeout"]:
          del authenticate.sessions[sid]
        else:
          # Ensure that the user is logged correctly ...
          cherrypy.request.login = authenticate.sessions[sid]["creator"]
          return
      else:
        # Expired or forged cookie
        cherrypy.log.error("@%s: expired/unknown session." % (remote_ip))

    # If the client hasn't authenticated, tell them to do so.
    authorization = cherrypy.request.headers.get("authorization")
    if authorization is None:
      cherrypy.response.headers["www-authenticate"] = "Basic realm=\"%s\"" % realm
      slycat.email.send_error("slycat-standard-authentication.py authenticate", "cherrypy.HTTPError 401 authentication required.")
      raise cherrypy.HTTPError(401, "Authentication required.")

    # Parse the client's authentication response.
    try:
      scheme, params = authorization.split(" ", 1)
    except:
      slycat.email.send_error("slycat-standard-authentication.py authenticate", "cherrypy.HTTPError 400")
      raise cherrypy.HTTPError(400)
    if scheme.lower() != "basic":
      slycat.email.send_error("slycat-standard-authentication.py authenticate", "cherrypy.HTTPError 400")
      raise cherrypy.HTTPError(400)
    try:
      username, password = base64_decode(params).split(":", 1)
    except:
      slycat.email.send_error("slycat-standard-authentication.py authenticate", "cherrypy.HTTPError 400")
      raise cherrypy.HTTPError(400)

    cherrypy.log.error("%s@%s: Checking password." % (username, remote_ip))

    if authenticate.password_check is None:
      if "password-check" not in cherrypy.request.app.config["slycat-web-server"]:
        raise cherrypy.HTTPError("500 No password check configured.")
      plugin = cherrypy.request.app.config["slycat-web-server"]["password-check"]["plugin"]
      args = cherrypy.request.app.config["slycat-web-server"]["password-check"].get("args", [])
      kwargs = cherrypy.request.app.config["slycat-web-server"]["password-check"].get("kwargs", {})
      if plugin not in slycat.web.server.plugin.manager.password_checks.keys():
        slycat.email.send_error("slycat-standard-authentication.py authenticate", "cherrypy.HTTPError 500 no password check plugin found.")
        raise cherrypy.HTTPError("500 No password check plugin found.")
      authenticate.password_check = functools.partial(slycat.web.server.plugin.manager.password_checks[plugin], *args, **kwargs)

    success, groups = authenticate.password_check(realm, username, password)
    if success:
      # Apply (optional) authentication rules.
      if rules is not None:
        deny = None
        for operation, category, members in rules:
          if operation not in ["allow", "deny"]:
            slycat.email.send_error("slycat-standard-authentication.py authenticate", "cherrypy.HTTPError 500 unknown operation: %s." % operation)
            raise cherrypy.HTTPError("500 Unknown operation: %s." % operation)
          if category not in ["users", "groups"]:
            slycat.email.send_error("slycat-standard-authentication.py authenticate", "cherrypy.HTTPError 500 unknown category: %s." % category)
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
      cherrypy.log.error("%s@%s: Password check succeeded." % (username, remote_ip))

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
    cherrypy.log.error("%s@%s: Password check failed." % (username, remote_ip))
    cherrypy.response.headers["www-authenticate"] = "Basic realm=\"%s\"" % realm
    slycat.email.send_error("slycat-standard-authentication.py authenticate", "cherrypy.HTTPError 401 authentication required.")
    raise cherrypy.HTTPError(401, "Authentication required.")

  authenticate.password_check = None
  authenticate.sessions = {}
  authenticate.session_cleanup = None

  context.register_tool("slycat-standard-authentication", "on_start_resource", authenticate)
