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
    import uuid
    from urlparse import urlparse

    def clean_up_old_session():
        """
        try and delete any outdated sessions
        for the user if they have the cookie for it
        :return:no-op
        """
        if "slycatauth" in cherrypy.request.cookie:
            try:
                # cherrypy.log.error("found old session trying to delete it ")
                sid = cherrypy.request.cookie["slycatauth"].value
                couchdb = slycat.web.server.database.couchdb.connect()
                session = couchdb.get("session", sid)
                if session is not None:
                    couchdb.delete(session)
            except:
                # if an exception was throw there is nothing to be done
                pass

    def check_user(session_user, apache_user, couchdb, sid, session):
        """
        check to see if the session user is equal to the apache user raise 403 and delete the
        session if they are not equal
        :param session_user: user_name in the couchdb use session
        :param apache_user: user sent in the apache header "authuser"
        :param couchdb: hook to couch
        :param sid: session id
        :param session: session object from couch
        :return:
        """
        if session_user != apache_user:
            cherrypy.log.error("session_user::%s is not equal to apache_user::%s in standard auth"
                               "deleting session and throwing 403 error to the browser" % (session_user, apache_user))
            couchdb.delete(session)
            # expire the old cookie
            cherrypy.response.cookie["slycatauth"] = sid
            cherrypy.response.cookie["slycatauth"]['expires'] = 0
            session = None
            cherrypy.response.status = "403 Forbidden"
            raise cherrypy.HTTPError(403)

    def create_single_sign_on_session(remote_ip, apache_username):
        """
        WSGI/RevProxy no-login session creations.
        Successful authentication and access verification,
        create a session and return.
        :return: authentication status
        """
        clean_up_old_session()
        # must define groups but not populating at the moment !!!
        groups = []

        # Successful authentication and access verification, create a session and return.
        cherrypy.log.error("++ login2 creating session for %s" % apache_username)
        sid = uuid.uuid4().hex
        session = {"created": datetime.datetime.utcnow(), "creator": apache_username}
        database = slycat.web.server.database.couchdb.connect()
        database.save(
            {"_id": sid, "type": "session", "created": session["created"].isoformat(), "creator": session["creator"],
             'groups': groups, 'ip': remote_ip, "sessions": []})

        slycat.web.server.handlers.login.sessions[sid] = session

        cherrypy.response.cookie["slycatauth"] = sid
        cherrypy.response.cookie["slycatauth"]["path"] = "/"
        cherrypy.response.cookie["slycatauth"]["secure"] = 1
        cherrypy.response.cookie["slycatauth"]["httponly"] = 1
        timeout = int(cherrypy.request.app.config["slycat"]["session-timeout"].total_seconds())
        cherrypy.response.cookie["slycatauth"]["Max-Age"] = timeout
        cherrypy.response.cookie["slycattimeout"] = "timeout"
        cherrypy.response.cookie["slycattimeout"]["path"] = "/"
        cherrypy.response.cookie["slycattimeout"]["Max-Age"] = timeout

        cherrypy.response.status = "200 OK"
        cherrypy.request.login = apache_username

    def authenticate(realm, rules=None):
        # Sanity-check our inputs.
        if '"' in realm:
            slycat.email.send_error("slycat-standard-authentication.py authenticate",
                                    "Realm cannot contain the \" (quote) character.")
            raise ValueError("Realm cannot contain the \" (quote) character.")

        # wsgi: apache can probably handle ssl decrypt can reduce to http
        # we need to parse the current url so we can do an https redirect
        # cherrypy will redirect http by default :(
        current_url = urlparse(cherrypy.url() + "?" + cherrypy.request.query_string)
        # Require a secure connection.
        if not (cherrypy.request.scheme == "https" or cherrypy.request.headers.get("x-forwarded-proto") == "https"):
            slycat.email.send_error("slycat-standard-authentication.py authenticate",
                                    "cherrypy.HTTPError 403 secure connection required.")
            raise cherrypy.HTTPError("403 Secure connection required.")

        # Get the client ip, which might be forwarded by a proxy.
        remote_ip = cherrypy.request.headers.get(
            "x-forwarded-for") if "x-forwarded-for" in cherrypy.request.headers else cherrypy.request.rem
        auth_user = cherrypy.request.headers.get("Authuser")
        #cherrypy.log.error("++ std-auth running for %s at %s" % (auth_user, remote_ip))

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
                check_user(user_name, auth_user, couchdb, sid, session)
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
                create_single_sign_on_session(remote_ip, auth_user)
                # raise cherrypy.HTTPRedirect("https://" + current_url.netloc + "/login2/slycat-login.html?from=" + current_url.geturl().replace("http:", "https:"), 307)

                # Successful authentication, create a session and return.
                # return
        else:
            cherrypy.log.error("++ no cookie found redirecting %s to SSO_session" % remote_ip)
            create_single_sign_on_session(remote_ip, auth_user)
            # raise cherrypy.HTTPRedirect("https://" + current_url.netloc + "/login2/slycat-login.html?from=" + current_url.geturl().replace("http:", "https:"), 307)

    context.register_tool("slycat-standard-authentication", "on_start_resource", authenticate)
