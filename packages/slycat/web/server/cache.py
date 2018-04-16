# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.
import os
import hashlib
import cPickle
import time
import base64
import inspect
import Queue
import threading
import cherrypy

__all__ = ["CacheError", "Cache"]


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
  __lock = threading.Lock()
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
  def lock(self):
    """
    threading.Lock() used to control crud operations to the cache.
    :return:
    """
    return self.__lock
  @property
  def value(self):
    """
    returns the object that is being wrapped by the cache
    :return: object
    """
    return self._value

  @property
  def expiration(self):
    """
    return the expiration time for the cached object, could return none
    if there is no expiration
    :return: expiration object
    """
    return self._expiration

  @expiration.setter
  def expiration(self,expiration):
    """
    set the expiration time for the cached object, could return none
    if there is no expiration
    :return: expiration object
    """
    self._expiration = expiration

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
  decorator class used to cache
  """
  _lock = threading.Lock()
  def __init__(self, fs_cache_path=None, **kwargs):
    """
    takes a filepath and and the following time stamps
       - years (31,556,900 seconds per year)
       - months (2,629,740 seconds per month)
       - weeks (604,800 seconds per week)
       - days (86,400 seconds per day)
       - hours (3600 seconds per hour)
       - minutes (60 seconds per minute)
       - seconds
       - None
    :param path: path as a string to the
    :param kwargs: time stamp
    """
    if kwargs:
      self._init_expire_time = self.to_seconds(**kwargs)
      # we need a time greater than 0
      if self._init_expire_time <= 0:
        msg = "[CACHE] Lifetime (%s seconds) is 0 or less." % self._init_expire_time
        cherrypy.log.error(msg)
        raise LifetimeError, msg
    else:
      # no expiration time
      self._init_expire_time = None
    # set up an in memory cache
    self._loaded = {}

    # set path for file system
    if fs_cache_path:
      self._fs_cache_path = os.path.abspath(fs_cache_path)
      if not os.path.exists(self._fs_cache_path):
        os.makedirs(self._fs_cache_path)
    else:
      self._fs_cache_path = None

  def check_fs_path(self):
    """
    This function is used to set the file path as it does
    not exist when the cache is created in the server/__init__.py
    :return:
    """
    if not self._fs_cache_path:
      import slycat.web.server
      cherrypy.log.error("[CACHE] %s is the cache location" % (slycat.web.server.config["slycat-web-server"]["cache-store"]))
      self._fs_cache_path = os.path.abspath(slycat.web.server.config["slycat-web-server"]["cache-store"])
      if not os.path.exists(self._fs_cache_path):
        os.makedirs(self._fs_cache_path)

  def __getitem__(self, key):
    """
    get the item from the cache
    :param key: hashed key for item in cache
    :return: value associate with key
    """
    self.check_fs_path()

    if key in self:
      digest = self.digest_hash(key)
      value = self._loaded[digest].value

      path = os.path.join(self._fs_cache_path, digest)
      # check if item exist
      if (digest in self._loaded) or os.path.exists(path):
        self.expire(digest)
      cached_contents = CachedObjectWrapper(value, expiration=self.cached_item_expire_time())
      self.write(cached_contents, path)
      self._loaded[digest] = cached_contents


    else:
      msg = "key not found in cache: '%s'" % key
      raise KeyError(msg)
    return value

  def __setitem__(self, key, value):
    """
    set the key:value in the cache. checks if it already in
    the cache and throws CacheError if found
    :param key: hashed representation of the function
    :param value: stored result from the function
    :return: not used
    """
    self.check_fs_path()

    digest_hash = self.digest_hash(key)
    path = os.path.join(self._fs_cache_path, digest_hash)
    #check if item exist
    if (digest_hash in self._loaded) or os.path.exists(path):
      self.expire(digest_hash)
    cached_contents = CachedObjectWrapper(value, expiration=self.cached_item_expire_time())
    self.write(cached_contents, path)
    self._loaded[digest_hash] = cached_contents

  def __delitem__(self, digest_hash):
    """
    Removes the hash keyed object from memory
    but not from the filesystem.
    see function expire to remove from booth
    :param key: item to be removed from memory
    :return: not used
    """
    self.check_fs_path()

    # digest_hash = self.digest_hash(key)
    if digest_hash in self._loaded:
      del self._loaded[digest_hash]
    else:
      msg = "[CACHE] Cannot delete object at %s not loaded in memory" % str(digest_hash)
      raise CacheError, msg

  def __contains__(self, item):
    """
    check if item is in the cache, true if in the cache
    false otherwise
    :param item: item to search for in cache
    :return: boolean
    """
    self.check_fs_path()

    digest = self.digest_hash(item)
    # get the item from the cache
    if digest in self._loaded:
      value = self._loaded[digest]
    #item was not in cache check file system
    else:
      try:
        value = self._load(digest, item)
      except CacheError:
        # item was not in the cache or the file system
        return False
    # check if it has expired
    if value.expired():
      cherrypy.log.error("[CACHE] value is expired")
      #contents were expired so we should delete them and return false
      self.expire(digest)
      return False
    return True

  def __call__(self, f):
    """
    This is the decorator cache call
    :param f: function to be wrapped
    :return: results of the function either from
    the cache or the function itself
    """

    function_meta_data = inspect.getmembers(f)
    try:
      fid = (function_meta_data.func_name, inspect.getargspec(f))
    except (AttributeError, TypeError):
      fid = (f.__name__, repr(type(f)))

    def _f(*args, **kwargs):
      key = (fid, args, kwargs)

      # cherrypy.log.error("\nargs: %s    \nkwargs %s  \n%s \n%s" % (str(args),kwargs,fid,self.digest_hash(key)))
      #check if we have cached the result
      if key in self:
        cherrypy.log.error("[CACHE] Found in cache")
        result = self[key]
      #we have not cached the result so lets get it
      else:
        cherrypy.log.error("[CACHE] NOT found in cache")
        result = f(*args, **kwargs)
        self[key] = result
      return result
    return _f

  def expire(self, digest_hash):
    """
    Permanently removes the, both in the memory and in the filesystem.
    """
    if digest_hash in self.fs_keys:
      self._remove(digest_hash)
    if digest_hash in self.v_keys:
      try:
        del self[digest_hash]
      except CacheError as e:
        print cherrypy.log.error("[CACHE] error deleteing item %s"%e.message)

  def _remove(self, digest):
    """
    Removes the cache item keyed by `key` from the file system.
    """
    # cherrypy.log.error("[CACHE] trying to remove %s from file system cache" % digest)
    # digest = self.digest_hash(key)
    path = os.path.join(self._fs_cache_path, digest)
    if os.path.exists(path):
      # cherrypy.log.error("[CACHE] removing %s from file system cache" % path)
      try:
        os.remove(path)
      except:
        msg = "[CACHE] No object for key `%s` stored." % str(path)
        cherrypy.log.error(msg)
    else:
      msg = "[CACHE] No object for key `%s` stored." % str(path)
      cherrypy.log.error(msg)

  def unload(self, k):
    """
    Removes the object keyed by k
    from virtual memory only.
    :param k:
    :return:
    """
    digest = self.digest_hash(k)
    if digest in self._loaded:
      del(self._loaded[digest])

  def load(self, key):
    """
    Causes the object keyed by `k` to be loaded from the
    file system and returned. It therefore causes this object
    to reside in memory.
    """
    return self[key]

  def _load(self, digest, k):
    """
    Loads the :class:`CacheObject` keyed by `k` from the
    file system (residing in a file named by `digest`)
    and returns the object.
    This method is part of the implementation of :class:`FSCache`,
    so don't use it as part of the API.
    """
    path = os.path.join(self._fs_cache_path , digest)
    if os.path.exists(path):
      # cherrypy.log.error("[CACHE] %s fs path cache found" % (path))
      contents = self.read(path)
    else:
      msg = "[CACHE] Object for key `%s` does not exist." % (k,)
      raise CacheError, msg
    self._loaded[digest] = contents
    return contents

  def cached_item_expire_time(self):
    """
    Returns an expiry for the cache in seconds as if the start
    of the expiration period were the moment at which this
    the method is called.
    >>> import time
    >>> c = Cache('cache/dir', seconds=60)
    >>> round(c.cached_item_expire_time() - time.time(), 3)
    60.0
    """
    if self._init_expire_time is None:
      x = None
    else:
      x = self._init_expire_time + time.time()
    return x

  @property
  def v_keys(self):
    """
    Returns a list of virtual memory keys.
    :return: keys for virtual cache
    """
    return self._loaded.keys()

  @property
  def fs_keys(self):
    """
    Returns the names of the files
    in the cache on the filesystem.
    :return: list of names of cached files
    """
    return os.listdir(self._fs_cache_path)

  def clean(self):
    """
    clean the in memory and fs cache
    recommended to call this by some thread under a
    certain time interval
    :return: not used
    """
    cherrypy.log.error("[CACHE] starting the cleaning session for the file system cache")
    self.check_fs_path()

    for f in os.listdir(self._fs_cache_path):
      path = os.path.join(self._fs_cache_path, f)
      contents = self.read(path)
      if contents.expired():
        cherrypy.log.error("[CACHE] expired content found for %s deleting it" % f)
        self.expire(f)
    # for key in self.v_keys:
    #   # TODO: add logic to keep v_cache_dict clean: if self._loaded[f].epiration - :
    #     pass

  def clear(self):
    """
    clear cache items from virtual memory.
    :return: not used
    """
    self._loaded.clear()

  def purge(self):
    """
    empties the cache from fs and v memory
    :return: not used
    """
    for f in os.listdir(self._fs_cache_path):
      path = os.path.join(self._fs_cache_path, f)
      os.remove(path)
    self.clear()

  @property
  def lock(self):
    """
    threading.Lock() used to control crud operations to the cache.
    :return:
    """
    return self._lock

  @staticmethod
  def digest_hash(key):
    """
    Creates a digest hash
    >>> adict = {'a' : {'b':1}, 'f': []}
    >>> Cache.digest_hash(adict)
    'a2VKynHgDrUIm17r6BQ5QcA5XVmqpNBmiKbZ9kTu0A'
    :param key: key to hash
    :return: digest hash of key
    """
    # try:
    #   string_rep = cPickle.dumps(key)
    # except Exception as e:
    #   cherrypy.log.error("PICKLE error: %s  %s" % (e.message,key))
    #   raise Exception
    digest_hash = hashlib.sha256(str(key)).digest()
    b64_digest_hash = base64.urlsafe_b64encode(digest_hash)[:-2]
    return b64_digest_hash.replace('-', '=')

  def read(self, filename):
    """
    Helper function that simply pickle loads the first object
    from the file named by `filename`.
    """
    with self.lock:
      with open(filename, 'rb') as loaded_file:
        loaded_obj = cPickle.load(loaded_file)
    return loaded_obj

  def write(self, obj, filename):
    """
    writes and object to the selected file path
    """
    with self.lock:
      with open(filename, 'wb') as cache_file:
        cPickle.dump(obj, cache_file, protocol=cPickle.HIGHEST_PROTOCOL)

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
    :return: float
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
    :return: float
    """
    return 3600.0 * hours

  @staticmethod
  def minutes_to_seconds(minutes):
    """
    Converts minutes to seconds.
    :return: float
    """
    return 60.0 * minutes

  @staticmethod
  def seconds_to_seconds(seconds):
    """
    Converts seconds to seconds as a float.
    :return: float
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
  cache = Cache("cache/dir", seconds=20)

  @cache
  def hello(seed=1):
    """
    test function
    :param seed: some garbage number
    :return: seed+hello+rand and a string
    """
    import random
    print "\nnot cached"
    return str(seed)+"hello"+ str(random.random())

  print hello()
  print hello(seed=2)
  print hello(seed=1)
  print
  print hello()
  print hello(seed=2)
  cache["meow"] = "xyz"
  print cache["meow"]

  cache["meow"] = "rgb"
  print cache["meow"]
  # print cache[hello()]















