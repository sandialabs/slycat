# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

def register_slycat_plugin(context):
    """
    register a plugin
    :param context:
    :return:
    """
    import cherrypy
    import datetime
    import slycat.web.server
    
    import urlparse

    def authenticate(realm, rules=None):
        # Sanity-check our inputs.
        if '"' in realm:
            cherrypy.log.error("slycat-standard-authentication.py authenticate",
                                    "Realm cannot contain the \" (quote) character.")
            raise ValueError("Realm cannot contain the \" (quote) character.")

        current_url = urlparse.urlparse(cherrypy.url() + "?" + cherrypy.request.query_string)
        # Require a secure connection.
        if not (cherrypy.request.scheme == "https" or cherrypy.request.headers.get("x-forwarded-proto") == "https"):
            cherrypy.log.error("slycat-standard-authentication.py authenticate",
                                    "cherrypy.HTTPError 403 secure connection required.")
            raise cherrypy.HTTPError(403, 'Secure connection is required')

        # Get the client ip, which might be forwarded by a proxy.
        remote_ip = slycat.web.server.check_https_get_remote_ip()
        
        #cherrypy.log.error("++ openid-auth existing snlauth cookie: %s" % str("slycatauth" in cherrypy.request.cookie) )

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

                # no caching plz
                cherrypy.response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"  # HTTP 1.1.
                cherrypy.response.headers["Pragma"] = "no-cache"  # HTTP 1.0.
                cherrypy.response.headers["Expires"] = "0"  # Proxies.

                if datetime.datetime.utcnow() - datetime.datetime.strptime(unicode(started), '%Y-%m-%dT%H:%M:%S.%f') > \
                        cherrypy.request.app.config["slycat"]["session-timeout"]:
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
                cherrypy.log.error("++ auth error, found cookie with expired session, asking user to login ")
                # raise cherrypy.HTTPError(401, 'Authentication is required')
                raise cherrypy.HTTPRedirect("https://" + current_url.netloc + "/openid_login.html", 307)

        else:
            # OpenID Note: incoming user doesn't have a session. Route through openid login process starting
            # at /index.html to authenticate & create a session. OpenID server will return user back
            # to /openid-login/ (see open_id_authenticate() in handlers) which then creates the session.
            cherrypy.log.error("++ unauthenticated request, asking user to login")
            # raise cherrypy.HTTPError(401, 'Authentication is required')
            raise cherrypy.HTTPRedirect("https://" + current_url.netloc + "/openid_login.html", 307)

    context.register_tool("slycat-openid-authentication", "on_start_resource", authenticate)
