# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import traceback

class prototype:
  """Prototype for a directory object that returns metadata associated with a user id."""
  def user(self, username):
    """Return a dictionary containing metadata describing a user, identified by username."""
    raise NotImplementedError()

class identity(prototype):
  """Directory implementation that returns a fake record for any user id that
  doesn't appear in a blacklist.  Useful for debugging and testing."""
  def __init__(self, domain, blacklist=["nobody"]):
    self._domain = domain
    self._blacklist = blacklist

  def user(self, username):
    if username in self._blacklist:
      return None
    return {
      "name" : username,
      "email" : "%s@%s" % (username, self._domain),
      }

class ldap(prototype):
  """Directory implementation that uses LDAP to perform user lookups."""
  def __init__(self, server, dn, w="", c=""):
    self.server = server
    self.dn = dn
    self.who = w     #the bindDN for the query
    self.cred = c    #credential associated with bindDN
    self.cache = {}

  def user(self, username):
    if username not in self.cache:
      try:
        entry = self._ldap_query("uid=%s" % username)
        self.cache[username] = {
          "name" : entry["cn"][0],
          "email" : "%s@%s" % (username, entry["esnAdministrativeDomainName"][0]),
          }
      except Exception as e:
        cherrypy.log.error(traceback.format_exc())

    if username in self.cache:
      return self.cache[username]

    return None

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
      cherrypy.log.error(traceback.format_exc())
      return None
