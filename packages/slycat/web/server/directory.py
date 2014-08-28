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
    self.uid_cache = {}
    self.gid_cache = {}

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
  
  def uid_to_username(self, uid):
    if uid not in self.uid_cache:
      search_filter = "esnAccountUnixUserId=%s" % uid
      try:
        entry = self.ldap_query(search_filter, required=['uid'])
        self.uid_cache[uid] = entry["uid"][0]
      except Exception as e:
        cherrypy.log.error("%s" % e)
        return None
    
    if uid in self.uid_cache:
      return self.uid_cache[uid]

    return None
  
  def gid_to_username(self, gid):
    if gid not in self.gid_cache:
      search_filter = "esnUnixGroupId=%s" % gid
      try:
        entry = self.ldap_query(search_filter, required=['uid'])
        self.gid_cache[gid] = entry["uid"][0]
      except Exception as e:
        cherrypy.log.error("%s" % e)
        return None
    
    if gid in self.gid_cache:
      return self.gid_cache[gid]

    return None

  def ldap_query(self, search_filter, required=[]):
    try:
      import ldap
      ldap.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_NEVER)
      connection = ldap.initialize(self.server)
      result = connection.search_s(self.dn, ldap.SCOPE_SUBTREE, search_filter)
      if len(result) < 1: raise Exception("Improper LDAP Query")
      if len(result) > 1 and len(required) >= 1:
        # we need to find which record has what we want
        for r in result:
          if "uid" in r[1]: return r[1]

      return result[0][1]
    except Exception as e:
      cherrypy.log.error("%s" % e)
      return None
