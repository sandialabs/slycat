# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy

class prototype:
  """Prototype for a directory object that returns metadata associated with a user id."""
  def user(self, username):
    """Return a dictionary containing metadata describing a user, identified by username."""
    raise NotImplementedError()

  def username(self, uid, filter_key="esnAccountUnixUserId"):
    """Lookup a username, given an integer user id."""
    raise NotImplementedError()

  def groupname(self, gid, filter_key="esnUnixGroupId"):
    """Lookup a group name, given an integer group id."""
    raise NotImplementedError()

class identity(prototype):
  """Directory implementation that returns a fake record for any user id that
  doesn't appear in a blacklist.  Useful for debugging and testing."""
  def __init__(self, domain, uid_map={}, gid_map={}, blacklist=["nobody"]):
    self._domain = domain
    self._uid_map = uid_map
    self._gid_map = gid_map
    self._blacklist = blacklist

  def user(self, username):
    if username in self._blacklist:
      return None
    return {
      "name" : username,
      "email" : "%s@%s" % (username, self._domain),
      "roles" : []
      }

  def username(self, uid, filter_key="esnAccountUnixUserId"):
    if uid in self._uid_map:
      return self._uid_map[uid]
    return uid

  def groupname(self, gid, filter_key="esnUnixGroupId"):
    if gid in self._gid_map:
      return self._gid_map[gid]
    return gid

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

  def user(self, username):
    if username not in self.cache:
      try:
        entry = self._ldap_query("uid=%s" % username)
        self.cache[username] = {
          "name" : entry["cn"][0],
          "email" : "%s@%s" % (username, entry["esnAdministrativeDomainName"][0]),
          "roles" : entry["memberOf"]
          }
      except Exception as e:
        cherrypy.log.error("%s" % e)

    if username in self.cache:
      return self.cache[username]

    return None

  def username(self, uid, filter_key="esnAccountUnixUserId"):
    if uid not in self.uid_cache:
      search_filter = "%s=%s" % (filter_key,uid)
      try:
        entry = self._ldap_query(search_filter, required=['uid'])
        self.uid_cache[uid] = entry["uid"][0]
      except Exception as e:
        cherrypy.log.error("%s" % e)
        return id

    if uid in self.uid_cache:
      return self.uid_cache[uid]

    return uid

  def groupname(self, gid, filter_key="esnUnixGroupId"):
    if gid not in self.gid_cache:
      search_filter = "%s=%s" % (filter_key,gid)
      try:
        entry = self._ldap_query(search_filter, required=['uid'])
        self.gid_cache[gid] = entry["uid"][0]
      except Exception as e:
        cherrypy.log.error("%s" % e)
        return gid

    if gid in self.gid_cache:
      return self.gid_cache[gid]

    return gid

  def _ldap_query(self, search_filter, required=[]):
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
