# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

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

    from urllib.parse import urlparse
    #from urlparse import urlparse

    def authenticate(realm, rules=None):
        # Sanity-check our inputs.
        if '"' in realm:
            slycat.email.send_error("slycat-standard-authentication.py authenticate",
                                    "Realm cannot contain the \" (quote) character.")
            raise ValueError("Realm cannot contain the \" (quote) character.")

        current_url = urlparse(cherrypy.url() + "?" + cherrypy.request.query_string)

        # Req a https connection, Get client ip which might be forwarded by a proxy
        remote_ip = slycat.web.server.check_https_get_remote_ip()

#        cherrypy.log.error("++ PKI Auth: req headers: %s " % cherrypy.request.headers)
        userHeaderVar = "SSL-Authuser"

        # TODO: add try around the below get()
        auth_user = cherrypy.request.headers.get(userHeaderVar).split()[-1]
        # 2021:  PKI certs begin to list usernames in ALL CAPS, convert to lower case
        auth_user = auth_user.lower()

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
                slycat.web.server.check_user(user_name, auth_user, sid)
                groups = session["groups"]

                # no chaching plz
                cherrypy.response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"  # HTTP 1.1.
                cherrypy.response.headers["Pragma"] = "no-cache"  # HTTP 1.0.
                cherrypy.response.headers["Expires"] = "0"  # Proxies.

                if datetime.datetime.utcnow() - datetime.datetime.strptime(str(started), '%Y-%m-%dT%H:%M:%S.%f') > \
                        cherrypy.request.app.config["slycat"]["session-timeout"]:
                    couchdb.delete(session)

                    # expire the old cookie
                    cherrypy.response.cookie["slycatauth"] = sid
                    cherrypy.response.cookie["slycatauth"]['expires'] = 0
                    session = None
                cherrypy.request.login = auth_user
                # Apply (optional) authentication rules.
            except Exception as e:
                cherrypy.log.error("++ PKI Auth logging exception: %s, couchDB session not found for %s" % (e, remote_ip))

            # there was no session time to authenticate
            if session is None:
                cherrypy.log.error("++ PKI Auth: redirecting %s to SSO_session" % remote_ip)
                slycat.web.server.create_single_sign_on_session(remote_ip, auth_user)

                # Successful authentication, create a session and return.
                # return
        else:
            cherrypy.log.error("++ PKI Auth: no cookie found, redirecting %s to SSO_session" % remote_ip)
            slycat.web.server.create_single_sign_on_session(remote_ip, auth_user)

    context.register_tool("slycat-sso-pki-authentication", "on_start_resource", authenticate)
