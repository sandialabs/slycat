# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def register_slycat_plugin(context):
  import cherrypy
  import datetime
  def check_password(realm, username, password, server="", user_dn="", group=None, timeout=datetime.timedelta(seconds=5)):
    try:
      user_dn = user_dn.format(username)

      import ldap
      ldap.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_NEVER)
      ldap.set_option(ldap.OPT_NETWORK_TIMEOUT, timeout.total_seconds())
      connection = ldap.initialize(server)
      connection.simple_bind_s(user_dn, password)
      if group is not None:
        entry = connection.search_s(user_dn, ldap.SCOPE_BASE)
        cherrypy.log.error("%s" % entry)
      return True
    except Exception as e:
      cherrypy.log.error("%s" % e)
      return False

  context.register_password_check("slycat-ldap-password-check", check_password)
