# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

# changes for wsgi implementation
#
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
  from urlparse import urlparse

  def authenticate(realm, rules=None):
    # Sanity-check our inputs.
    if '"' in realm:
      slycat.email.send_error("slycat-standard-authentication.py authenticate", "Realm cannot contain the \" (quote) character.")
      raise ValueError("Realm cannot contain the \" (quote) character.")

    # we need to parse the current url so we can do an https redirect
    # cherrypy will redirect http by default :(
    current_url = urlparse(cherrypy.url()+"?"+cherrypy.request.query_string)
    # Require a secure connection.
    if not (cherrypy.request.scheme == "https" or cherrypy.request.headers.get("x-forwarded-proto") == "https"):
      slycat.email.send_error("slycat-standard-authentication.py authenticate", "cherrypy.HTTPError 403 secure connection required.")
      raise cherrypy.HTTPError("403 Secure connection required.")

    # Get the client ip, which might be forwarded by a proxy.
    remote_ip = cherrypy.request.headers.get("x-forwarded-for") if "x-forwarded-for" in cherrypy.request.headers else cherrypy.request.rem

    # See if the client already has a valid session.
    if "slycatauth" in cherrypy.request.cookie:
      sid = cherrypy.request.cookie["slycatauth"].value
      couchdb = slycat.web.server.database.couchdb.connect()
      session = None
      try:
        session = couchdb.get("session", sid)
        started = session["created"]
        user_name = session["creator"]
        groups = session["groups"]

        # no chaching plz
        cherrypy.response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate" # HTTP 1.1.
        cherrypy.response.headers["Pragma"] = "no-cache" # HTTP 1.0.
        cherrypy.response.headers["Expires"] = "0" # Proxies.

        # cherrypy.log.error("%s ::: %s" % (datetime.datetime.utcnow() - datetime.datetime.strptime(unicode(started),'%Y-%m-%dT%H:%M:%S.%f'),cherrypy.request.app.config["slycat"]["session-timeout"]))
        # cherrypy.log.error("%s" % (datetime.datetime.utcnow() - datetime.datetime.strptime(unicode(started), '%Y-%m-%dT%H:%M:%S.%f') > cherrypy.request.app.config["slycat"]["session-timeout"]))
        if datetime.datetime.utcnow() - datetime.datetime.strptime(unicode(started), '%Y-%m-%dT%H:%M:%S.%f') > cherrypy.request.app.config["slycat"]["session-timeout"]:
          couchdb.delete(session)
          # expire the old cookie
          cherrypy.response.cookie["slycatauth"] = sid
          cherrypy.response.cookie["slycatauth"]['expires'] = 0
          session = None
        cherrypy.request.login = user_name
             # Apply (optional) authentication rules.
      except Exception as e:
        cherrypy.log.error("@%s: could not get db session from cookie for %s" % (e, remote_ip))

      # there was no session time to authenticate
      if session is None:
        cherrypy.log.error("no session found redirecting %s to login" % remote_ip)
        raise cherrypy.HTTPRedirect("https://" + current_url.netloc + "/login/slycat-login.html?from=" + current_url.geturl().replace("http:", "https:"), 307)

      # Successful authentication, create a session and return.
      #return
    else:
      cherrypy.log.error("no cookie found redirecting %s to login" % remote_ip)
      raise cherrypy.HTTPRedirect("https://" + current_url.netloc + "/login/slycat-login.html?from=" + current_url.geturl().replace("http:", "https:"), 307)

  context.register_tool("slycat-standard-authentication", "on_start_resource", authenticate)
