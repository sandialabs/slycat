# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

def register_slycat_plugin(context):
  import cherrypy
  import datetime
  import slycat.email

  def check_password(realm, username, password, server="", user_dn="", group=None, timeout=datetime.timedelta(seconds=5)):
    groups = []
    try:
      user_dn = user_dn.format(username)

      import ldap
      ldap.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_NEVER)
      ldap.set_option(ldap.OPT_NETWORK_TIMEOUT, timeout.total_seconds())
      connection = ldap.initialize(server)
      connection.simple_bind_s(user_dn, password)
      entries = connection.search_s(user_dn, ldap.SCOPE_BASE)
      if len(entries) > 1:
        slycat.email.send_error("slycat-ldap-password-check.py check_password", "More than one matching directory entry.")
        raise Exception("More than one matching directory entry.")
      if group in entries[0][1]:
        groups = entries[0][1][group]
      return True, groups
    except Exception as e:
      cherrypy.log.error("%s" % e)
      return False, groups

  context.register_password_check("slycat-ldap-password-check", check_password)
