import cherrypy
import datetime
import traceback

configuration = {
  "cache" : {},
  "server" : None,
  "timeout" : None,
  "user_dn" : None,
}

def init(server, user_dn, timeout=datetime.timedelta(seconds=5)):
  global configuration
  configuration["server"] = server
  configuration["timeout"] = timeout
  configuration["user_dn"] = user_dn

def user(uid):
  global configuration
  if uid not in configuration["cache"]:
    try:
      # Lookup the requested user in LDAP.
      import ldap
      ldap.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_NEVER)
      ldap.set_option(ldap.OPT_NETWORK_TIMEOUT, configuration["timeout"].total_seconds())
      connection = ldap.initialize(configuration["server"])

      # This would require the username and password *of the person making the request*
      #bind_dn = configuration["user_dn"] % username
      #connection.simple_bind_s(bind_dn, password)

      search_dn = configuration["user_dn"] % uid # username of the person we're looking up.
      result = connection.search_s(search_dn, ldap.SCOPE_SUBTREE)

      # Cache the information we need for speedy lookup.
      result = result[0][1]
      configuration["cache"][uid] = {
        "name" : result["cn"][0],
        "email" : "%s@%s" % (uid, result["esnAdministrativeDomainName"][0]),
        }
    except ldap.NO_SUCH_OBJECT:
      raise cherrypy.HTTPError(404)
    except:
      cherrypy.log.error(traceback.format_exc())
      raise cherrypy.HTTPError(500)
  return configuration["cache"][uid]

def register_slycat_plugin(context):
  context.register_directory("ldap", init, user)

