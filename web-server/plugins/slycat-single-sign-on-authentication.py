# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
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
    import slycat.web.server.database.couchdb
    import slycat.web.server.plugin
    import slycat.web.server.handlers
    import slycat.email
    from urlparse import urlparse

    def authenticate(realm, rules=None):
        # Sanity-check our inputs.
        if '"' in realm:
            slycat.email.send_error("slycat-standard-authentication.py authenticate",
                                    "Realm cannot contain the \" (quote) character.")
            raise ValueError("Realm cannot contain the \" (quote) character.")

        current_url = urlparse(cherrypy.url() + "?" + cherrypy.request.query_string)

        # Require a secure connection.
        # Get the client ip, which might be forwarded by a proxy.
        remote_ip = slycat.web.server.check_https_get_remote_ip()

        # header username field parsing
        hdr_val = slycat.web.server.config["slycat-web-server"]["auth-parse"]["header-key"]
        delim = slycat.web.server.config["slycat-web-server"]["auth-parse"]["delimeter"]
        username_idx = slycat.web.server.config["slycat-web-server"]["auth-parse"]["username-index"]

        # get the username
        try:
            auth_user = cherrypy.request.headers.get(hdr_val).split(delim)[username_idx]
        except:
            raise cherrypy.HTTPError("407 Proxy Authentication Required: Slycat could not parse an authorized username.")

        # validate that header auth parsing returns a plausible username
        if len(auth_user) > 0 and isinstance(auth_user, basestring):  # tests for str and unicode
        #if len(auth_user) > 0 and isinstance(auth_user, str):        # python 3 version
            pass
        else:
            raise cherrypy.HTTPError("407 Proxy Authentication Required: Slycat did not receive a valid username string.")
        
        # See if the client already has a valid session.
        if "slycatauth" in cherrypy.request.cookie:
            sid = cherrypy.request.cookie["slycatauth"].value
            couchdb = slycat.web.server.database.couchdb.connect()
            session = None
            try:
                session = couchdb.get("session", sid)
                started = session["created"]
                user_name = session["creator"]

                # check if users match blow away the session if they dont and throw
                # an unauthorized error to the web browser
                slycat.web.server.check_user(user_name, auth_user, couchdb, sid, session)
                groups = session["groups"]

                # no chaching plz
                cherrypy.response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"  # HTTP 1.1.
                cherrypy.response.headers["Pragma"] = "no-cache"  # HTTP 1.0.
                cherrypy.response.headers["Expires"] = "0"  # Proxies.

                # cherrypy.log.error("%s ::: %s" % (datetime.datetime.utcnow() - datetime.datetime.strptime(unicode(started),'%Y-%m-%dT%H:%M:%S.%f'),cherrypy.request.app.config["slycat"]["session-timeout"]))
                # cherrypy.log.error("%s" % (datetime.datetime.utcnow() - datetime.datetime.strptime(unicode(started), '%Y-%m-%dT%H:%M:%S.%f') > cherrypy.request.app.config["slycat"]["session-timeout"]))
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
                cherrypy.log.error("++ no session found redirecting %s to SSO_session" % remote_ip)
                # Successful authentication, create a session and return.
                slycat.web.server.create_single_sign_on_session(remote_ip, auth_user)
        else:
            cherrypy.log.error("++ no cookie found redirecting %s to SSO_session" % remote_ip)
            slycat.web.server.create_single_sign_on_session(remote_ip, auth_user)

    context.register_tool("slycat-single-sign-on-authentication", "on_start_resource", authenticate)
