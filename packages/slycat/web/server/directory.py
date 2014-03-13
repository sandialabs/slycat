# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy

class prototype:
  """Prototype for a directory object that returns metadata associated with a user id."""
  def user(self, uid):
    raise NotImplementedError()

class identity(prototype):
  """Directory implementation that returns a fake record for any user id that
  doesn't appear in a blacklist.  Useful for debugging and testing."""
  def __init__(self, domain, blacklist=["nobody"]):
    self.domain = domain
    self.blacklist = blacklist

  def user(self, uid):
    if uid in self.blacklist:
      return None
    return {
      "name" : uid,
      "email" : "%s@%s" % (uid, self.domain),
      "roles" : []
      }

class ldap(prototype):
  """Directory implementation that uses LDAP to perform user lookups."""
  def __init__(self, server, dn, w="", c=""):
    self.server = server
    self.dn = dn
    self.who = w     #the bindDN for the query
    self.cred = c    #credential associated with bindDN
    self.cache = {}

  def user(self, uid):
    if uid not in self.cache:
      try:
        import ldap
        ldap.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_NEVER)
        connection = ldap.initialize(self.server)
        connection.simple_bind_s(self.who, self.cred)
        result = connection.search_s(self.dn % uid, ldap.SCOPE_BASE)
        if len(result) < 1: raise Exception("Improper LDAP Query")
        entry = result[0][1]
        self.cache[uid] = {
          "name" : entry["cn"][0],
          "email" : "%s@%s" % (uid, entry["esnAdministrativeDomainName"][0]),
          "roles" : entry["memberOf"]
          }

        #import cherrypy
        #cherrypy.log.error("%s" % self.cache[uid])

      except Exception as e:
        cherrypy.log.error("%s" % e)

    if uid in self.cache:
      return self.cache[uid]

    return None

