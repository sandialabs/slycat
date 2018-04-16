# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import urlparse as _urlparse
import urllib as _urllib

class URI(object):
  """Encapsulates URI creation and editing with a URI.js compatible interface."""
  def __init__(self, value=""):
    self.href(value)

  def __str__(self):
    return self.href()

  def __repr__(self):
    return "slycat.uri.URI('%s')" % self.href()

  def href(self, value=None):
    """Return / assign the string representation of a URI."""
    if value is None:
      result = self._scheme + "://"
      if self._username is not None:
        result += self._username
        if self._password is not None:
          result += ":" + self._password
        result += "@"
      if self._hostname is not None:
        result += self._hostname
      if self._port is not None:
        result += ":" + str(self._port)
      if self._path:
        result += self._path
      if self._query:
        result += "?" + _urllib.urlencode(self._query, doseq=True)
      if self._fragment:
        result += "#" + self._fragment
      return result

    parsed = _urlparse.urlparse(value)
    self._scheme = parsed.scheme
    self._username = parsed.username
    self._password = parsed.password
    self._hostname = parsed.hostname
    self._port = parsed.port
    self._path = parsed.path
    self._params = parsed.params
    self._query = _urlparse.parse_qs(parsed.query, keep_blank_values=True, strict_parsing=True)
    self._fragment = parsed.fragment
    return self

  def toString(self):
    """Return the string representation of the URI."""
    return self.href()

  def valueOf(self):
    """Return the string representation of the URI."""
    return self.href()

  def protocol(self, value=None):
    """Return / assign the URI protocol."""
    if value is None:
      return self._scheme
    self._scheme = value
    return self

  def scheme(self):
    """Alias for URI.protocol()"""
    return self.protocol()

  def username(self, value=None):
    """Return / assign the URI username."""
    if value is None:
      return self._username
    self._username = value
    return self

  def password(self, value=None):
    """Return / assign the URI password."""
    if value is None:
      return self._password
    self._password = value
    return self

  def hostname(self, value=None):
    """Return / assign the URI hostname."""
    if value is None:
      return self._hostname
    self._hostname = value
    return self

  def port(self, value=None):
    """Return / assign the URI port."""
    if value is None:
      return str(self._port)
    self._port = int(value)
    return self

  def removeSearch(self, keys, value=None):
    """Remove values from the URI search section."""
    if not isinstance(keys, list):
      keys = [keys]
    for key in keys:
      if key in self._query:
        if value is None:
          del self._query[key]
        else:
          if value in self._query[key]:
            del self._query[key][self._query[key].index(value)]
    return self

  def removeQuery(self, keys, value=None):
    """Alias for URI.removeSearch()."""
    return self.removeSearch(keys, value)
