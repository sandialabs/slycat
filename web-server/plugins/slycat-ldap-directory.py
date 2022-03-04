# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import cherrypy
import datetime
import traceback


configuration = {
  "cache"    : {},
  "server"   : None,
  "base"     : None,
  "who"      : None,
  "cred"     : None,
  "attrlist" : None,
  "ldapEmail": None,
  "timeout"  : None
}

def init(server, base, who="", cred="", attrlist=["uid", "displayName", "mail"], ldapEmail="mail", timeout=datetime.timedelta(seconds=5)):
  global configuration
  configuration["server"] = server
  configuration["base"] = base
  configuration["who"] = who
  configuration["cred"] = cred
  configuration["attrlist"] = attrlist
  configuration["ldapEmail"] = ldapEmail
  configuration["timeout"] = timeout

def user(uid):
  global configuration
  if uid not in configuration["cache"]:
    try:
      # Lookup the given uid in ldap
      import ldap
      trace_level = 0  # 0=quiet,  1=verbose,  2=veryVerbose
      ldap.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_NEVER)
      ldap.set_option(ldap.OPT_NETWORK_TIMEOUT, configuration["timeout"].total_seconds())
      connection = ldap.initialize(configuration["server"], trace_level)
      connection.simple_bind_s(configuration["who"], configuration["cred"])     # empty string ok

      # perform the query
      result = connection.search_s(configuration["base"], ldap.SCOPE_ONELEVEL, "uid=%s" % uid, configuration["attrlist"])

      if result == []:
        cherrypy.log.error("slycat-ldap-directory.py user", "User ID, %s, was not found." % uid)
        raise cherrypy.HTTPError(404)

      # Cache the information we need for speedy lookup.
      result = result[0][1]
      configuration["cache"][uid] = {
        "name" : result["displayName"][0],
        "email" : result[configuration["ldapEmail"]][0],
        }
    except ldap.NO_SUCH_OBJECT:
      cherrypy.log.error("404 ldap.NO_SUCH_OBJECT")
      cherrypy.log.error("slycat-ldap-directory.py user", "cherrypy.HTTPError 404 ldap.NO_SUCH_OBJECT")
      raise cherrypy.HTTPError(404)
    except AssertionError as e:
      cherrypy.log.error( e.message )
      cherrypy.log.error("slycat-ldap-directory.py user", "cherrypy.HTTPError 404 %s" % e.message)
      raise cherrypy.HTTPError(404)
    except:
      cherrypy.log.error(traceback.format_exc())
      cherrypy.log.error("slycat-ldap-directory.py user", "cherrypy.HTTPError 500 %s" % traceback.format_exc())
      raise cherrypy.HTTPError(500)
  return configuration["cache"][uid]

def register_slycat_plugin(context):
  context.register_directory("ldap", init, user)

