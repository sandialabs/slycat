# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.


def register_slycat_plugin(context):
    import cherrypy
    import datetime
    import slycat.web.server.database.couchdb
    import slycat.web.server.plugin

    from urllib.parse import urlparse

    def authenticate(realm, rules=None):
        # Sanity-check our inputs.
        if '"' in realm:
            cherrypy.log.error(
                "slycat-standard-authentication.py authenticate",
                'Realm cannot contain the " (quote) character.',
            )
            raise ValueError('Realm cannot contain the " (quote) character.')

        # we need to parse the current url so we can do an https redirect
        # cherrypy will redirect http by default :(
        current_url = urlparse(cherrypy.url() + "?" + cherrypy.request.query_string)

        # Require a secure connection.
        # Get the client ip, which might be forwarded by a proxy.
        remote_ip = "127.0.0.1"

        # See if the client already has a valid session.
        if "slycatauth" in cherrypy.request.cookie:
            cherrypy.log.error("running cherrypy no authentication")
            sid = cherrypy.request.cookie["slycatauth"].value
            couchdb = slycat.web.server.database.couchdb.connect()
            session = None
            try:
                with slycat.web.server.database.couchdb.get_session_lock(sid):
                    session = couchdb.get("session", sid)
                    started = session["created"]
                    user_name = session["creator"]
                    groups = session["groups"]

                    # no chaching plz
                    cherrypy.response.headers["Cache-Control"] = (
                        "no-cache, no-store, must-revalidate"  # HTTP 1.1.
                    )
                    cherrypy.response.headers["Pragma"] = "no-cache"  # HTTP 1.0.
                    cherrypy.response.headers["Expires"] = "0"  # Proxies.

                    # cherrypy.log.error("%s ::: %s" % (datetime.datetime.now(datetime.timezone.utc) - datetime.datetime.strptime(unicode(started),'%Y-%m-%dT%H:%M:%S.%f'),cherrypy.request.app.config["slycat"]["session-timeout"]))
                    # cherrypy.log.error("%s" % (datetime.datetime.now(datetime.timezone.utc) - datetime.datetime.strptime(unicode(started), '%Y-%m-%dT%H:%M:%S.%f') > cherrypy.request.app.config["slycat"]["session-timeout"]))
                    if (
                        datetime.datetime.now(datetime.timezone.utc)
                        - datetime.datetime.strptime(
                            str(started), "%Y-%m-%dT%H:%M:%S.%f"
                        )
                        > cherrypy.request.app.config["slycat"]["session-timeout"]
                    ):
                        couchdb.delete(session)
                        # expire the old cookie
                        cherrypy.response.cookie["slycatauth"] = sid
                        cherrypy.response.cookie["slycatauth"]["expires"] = 0
                        session = None
                    cherrypy.request.login = "user_name"
                    session["last-active-time"] = str(
                        datetime.datetime.now(datetime.timezone.utc).isoformat()
                    )
                    couchdb.save(session)
                    # Apply (optional) authentication rules.
            except Exception as e:
                slycat.web.server.create_single_sign_on_session(
                    remote_ip, "user_name", secure=False
                )
                cherrypy.log.error(
                    "@%s: could not get db session from cookie for %s" % (e, remote_ip)
                )

        # there was no session time to authenticate
        else:
            slycat.web.server.create_single_sign_on_session(
                remote_ip, "user_name", secure=False
            )

    context.register_tool("slycat-no-authentication", "on_start_resource", authenticate)
