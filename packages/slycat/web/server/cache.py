# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.
import os
import hashlib
import cPickle
import time
import base64
import inspect
import Queue
import threading

__all__ = ["CacheError"]

class CacheError(Exception):
  """
  generic cached objecte error
  """
  pass

class TimeError(CacheError):
  """
  time error used for when the time is in the wrong format
  """
  pass

class LifetimeError(CacheError):
  """
  extention of the cached error where the lifetime of the cache object has expired
  """
  pass

class CachedObjectWrapper(object):
  """
  class used to wrap any object placed in the cache
  """
  def __init__(self, value, expiration=None):
    """
    creates a cached object with a cached items and an expiration
    :param value: item being wrapped
    :param expiration: time until the item is expire
    :return: not used
    """
    self._value = value
    self._expiration = expiration

  @property
  def value(self):
    """
    returns the object that is being wraped by the cache
    :return: object
    """
    return self._value

  @property
  def expiration(self):
    """
    return the expiration time for the cached object, could return none
    if there is no expiration
    :return: experation object
    """
    return self._expiration

  def expired(self):
    """
    return true or false as to weather the object is expired or not
    returns false if none
    :return: boolean
    """
    if self.expiration is None:
      r = False
    else:
      r = (self.expiration < time.time())
    return r

class Cache(object):
  """
  class used to cache HQL and metadata queries
   usage example:
      server_cache = ServeCache()
      with server_cache.lock:
        apply: crud operation to
          server_cache.cache["artifact:aid:mid"]
            \
             server_cache.cache["artifact:aid:mid"]["artifact:data"]
             eg: server_cache.cache["artifact:aid:mid"]["metadata"], server_cache.cache["artifact:aid:mid"]["hql-result"]

   NOTE: a parse tree is also generated in order to speed up future unseen calls
  """

  def __init__(self, path, **kwargs):
    pass





















