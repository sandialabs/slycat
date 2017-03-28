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
    import slycat.web.server
    import slycat.email
    import urlparse

    def authenticate(realm, rules=None):
        # Sanity-check our inputs.
        if '"' in realm:
            slycat.email.send_error("slycat-standard-authentication.py authenticate",
                                    "Realm cannot contain the \" (quote) character.")
            raise ValueError("Realm cannot contain the \" (quote) character.")

        # wsgi: apache can probably handle ssl decrypt can reduce to http
        # we need to parse the current url so we can do an https redirect
        # cherrypy will redirect http by default :(
        current_url = urlparse.urlparse(cherrypy.url() + "?" + cherrypy.request.query_string)
        # Require a secure connection.
        if not (cherrypy.request.scheme == "https" or cherrypy.request.headers.get("x-forwarded-proto") == "https"):
            slycat.email.send_error("slycat-standard-authentication.py authenticate",
                                    "cherrypy.HTTPError 403 secure connection required.")
            raise cherrypy.HTTPError("403 Secure connection required.")

        # Get the client ip, which might be forwarded by a proxy.
        remote_ip = slycat.web.server.check_https_get_remote_ip()
        
        cherrypy.log.error("++ openid-auth existing snlauth cookie: %s" % str("slycatauth" in cherrypy.request.cookie) )

        #auth_user = cherrypy.request.headers.get("Authuser")

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
                # check_user relies on header auth info which isn't available here
                #check_user(user_name, auth_user, couchdb, sid, session)
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
            #if session is None and auth_user != "":
                cherrypy.log.error("++ auth error, no session found ")
                #create_single_sign_on_session(remote_ip, auth_user)
                # raise cherrypy.HTTPRedirect("https://" + current_url.netloc + "/login2/slycat-login.html?from=" + current_url.geturl().replace("http:", "https:"), 307)
                raise cherrypy.HTTPError("401 Authentication required.")

                # Successful authentication, create a session and return.
                # return
        else:
            # this logic is bad, can't assume we have auth_user here, if no auth_user do something to get that info
            cherrypy.log.error("++ returning XXX: no cookie, no /projecst?authInfo... ")
            raise cherrypy.HTTPError("401 Authentication required.")
            #create_single_sign_on_session(remote_ip, auth_user)
            #raise cherrypy.HTTPRedirect("https://" + current_url.netloc + "/projects" , 307) #force redirect to /projects which is the current return_to location
            ##raise cherrypy.HTTPRedirect("https://" + current_url.netloc + "/login2/slycat-login.html?from=" + current_url.geturl().replace("http:", "https:"), 307)

    context.register_tool("slycat-openid-authentication", "on_start_resource", authenticate)
