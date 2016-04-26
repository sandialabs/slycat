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
  generic cached object error
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
      expired = False
    else:
      expired = (self.expiration < time.time())
    return expired

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
    """

    :param path:
    :param kwargs:
    """
    if kwargs:
      self._lifetime = self.to_seconds(**kwargs)
      if self._lifetime <= 0:
        msg = "Lifetime (%s seconds) is 0 or less." % self._lifetime
        raise LifetimeError, msg
    else:
      self._lifetime = None
    self._loaded = {}
    self._path = os.path.abspath(path)
    if not os.path.exists(self._path):
      os.makedirs(self._path)

  @staticmethod
  def years_to_seconds(years):
    """
    Converts years to seconds.
    :return: float
    """
    return 3.15569e7 * years

  @staticmethod
  def months_to_seconds(months):
    """
    Converts months to seconds.
    :return: float
    """
    return 2.62974e6 * months

  @staticmethod
  def weeks_to_seconds(weeks):
    """
    Converts weeks to seconds.
    :return:
    """
    return 604800.0 * weeks

  @staticmethod
  def days_to_seconds(days):
    """
    Converts days to seconds.
    :return: float
    """
    return 86400.0 * days

  @staticmethod
  def hours_to_seconds(hours):
    """
    Converts hours to seconds.
    :return:
    """
    return 3600.0 * hours

  @staticmethod
  def minutes_to_seconds(minutes):
    """
    Converts minutes to seconds.
    :return:
    """
    return 60.0 * minutes

  @staticmethod
  def seconds_to_seconds(seconds):
    """
    Converts seconds to seconds as a float.
    :return:
    """
    return float(seconds)

  @staticmethod
  def to_seconds(**kwargs):
    """
    Converts keyword arguments to seconds.
    >>> Cache.to_seconds(seconds=1, minutes=1, hours=1, days=1, weeks=1, months=1, years=1)
    34881501.0
    >>> Cache.to_seconds(seconds=1, minutes=1)
    61
    :param kwargs:
        The the keyword arguments can have the following keys:
       - years (31,556,900 seconds per year)
       - months (2,629,740 seconds per month)
       - weeks (604,800 seconds per week)
       - days (86,400 seconds per day)
       - hours (3600 seconds per hour)
       - minutes (60 seconds per minute)
       - seconds
    :return: number of seconds as a float
    """
    time_converter_map = {"years": Cache.years_to_seconds,
                             "months": Cache.months_to_seconds,
                             "weeks": Cache.weeks_to_seconds,
                             "days": Cache.days_to_seconds,
                             "hours": Cache.hours_to_seconds,
                             "minutes": Cache.minutes_to_seconds,
                             "seconds": Cache.seconds_to_seconds}
    seconds = []
    for key, value in kwargs.items():
      if key in time_converter_map:
        seconds.append(time_converter_map[key](value))
      else:
        msg = "invalid time argument: %s" % key
        raise TimeError(msg)
    return sum(seconds)

if __name__ == "__main__":
  assert Cache.to_seconds(seconds=1, minutes=1) == 61, "time is not calculated correctly should be 61"
  assert Cache.to_seconds(seconds=1, minutes=1, hours=1, days=1, weeks=1, months=1, years=1) == 34881501.0, "time is not calculated correctly should be 34881501.0"
  try:
    Cache.to_seconds(not_a_key=1, minutes=1)
  except TimeError as e:
    assert e.message == 'invalid time argument: not_a_key', "did not catch bac key"

















