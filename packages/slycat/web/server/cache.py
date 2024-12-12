# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC.
# Under the terms of Contract DE-NA0003525 with National Technology and Engineering Solutions
# of Sandia, LLC, the U.S. Government retains certain rights in this software.


# standard library
import os
import hashlib
import pickle
import time
import base64
import inspect
import queue
import threading

# 3rd party library
import cherrypy

# local imports
import slycat.web.server

# public exports from this module
__all__ = ["CacheError", "Cache"]


# error catching for the cache
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
    extension of the cached error where the lifetime
    of the cache object has expired
    """

    pass


# a cached object consists of a value and an expiration
# as well as a thread lock
class CachedObjectWrapper(object):
    """
    class used to wrap any object placed in the cache
    """

    # lock on cached object
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
    def expiration(self, expiration):
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
            expired = self.expiration < time.time()
        return expired


class Cache(object):
    """
    decorator class used to cache
    """

    # lock on entire cache
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
                msg = (
                    "[CACHE] Lifetime (%s seconds) is 0 or less."
                    % self._init_expire_time
                )
                cherrypy.log.error(msg)
                raise LifetimeError(msg)
        else:
            # no expiration time
            self._init_expire_time = None

        # set up an in memory cache
        self._loaded = {}

        # set path for file system
        if fs_cache_path:
            self._fs_cache_path = os.path.abspath(fs_cache_path)

            # make cache directory unless it already exists
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

        # creates slycat web server cache, if it doesn't already exist
        if not self._fs_cache_path:
            cherrypy.log.error(
                "[CACHE] %s is the cache location."
                % (slycat.web.server.config["slycat-web-server"]["cache-store"])
            )
            self._fs_cache_path = os.path.abspath(
                slycat.web.server.config["slycat-web-server"]["cache-store"]
            )
            if not os.path.exists(self._fs_cache_path):
                os.makedirs(self._fs_cache_path)

    def __getitem__(self, key):
        """
        get the item from the cache
        :param key: hashed key for item in cache
        :return: value associate with key or None if not found
        """

        # check for slycat path
        self.check_fs_path()

        # is item in cache?
        if key in self:

            # get hash and value
            digest = self.digest_hash(key)
            value = self._loaded[digest].value
            expired = self._loaded[digest].expired()

            # if expired, erase and return None
            if expired:
                self.expire(digest)
                return None

        else:
            return None

        # cherrypy.log.error("[CACHE] Retrieving %s from cache." % str(digest))

        return value

    def __setitem__(self, key, value):
        """
        set the key:value in the cache. if it is already in
        the cache it gets replaced by new value
        :param key: hashed representation of the function
        :param value: stored result from the function
        :return: not used
        """

        # create slycat file path if it doesn't exist
        self.check_fs_path()

        # get hash and path
        digest_hash = self.digest_hash(key)
        path = os.path.join(self._fs_cache_path, digest_hash)

        # if item exists, erase it
        if (digest_hash in self._loaded) or os.path.exists(path):
            self.expire(digest_hash)

        # create new copy in cache
        cached_contents = CachedObjectWrapper(
            value, expiration=self.cached_item_expire_time()
        )
        self.write(cached_contents, path)
        self._loaded[digest_hash] = cached_contents

        # cherrypy.log.error ("[CACHE] Added %s to cache." % str(digest_hash))

    def __delitem__(self, digest_hash):
        """
        Removes the hash keyed object from memory
        but not from the filesystem.
        see function expire to remove from both
        :param key: item to be removed from memory
        :return: not used
        """

        # check slycat path
        self.check_fs_path()

        if digest_hash in self._loaded:
            del self._loaded[digest_hash]

        else:
            msg = "[CACHE] Cannot delete object at %s -- not loaded in memory" % str(
                digest_hash
            )
            raise CacheError(msg)

    def __contains__(self, item):
        """
        check if item is in the cache, true if in the cache
        false otherwise
        :param item: item to search for in cache
        :return: boolean
        """

        # check for slycat path
        self.check_fs_path()

        # create hash from item
        digest = self.digest_hash(item)

        # get the item from the cache
        if digest in self._loaded:
            value = self._loaded[digest]

        # item was not in memory, check file system
        else:
            try:
                value = self._load(digest, item)

            except CacheError:
                # item was not in the cache or the file system
                return False

        # check if it has expired
        if value.expired():

            # cherrypy.log.error("[CACHE] value is expired for %s." % str(item))

            # contents were expired so we should delete them and return false
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

        # retrieve function id?
        function_meta_data = inspect.getmembers(f)
        try:
            fid = (function_meta_data.__name__, inspect.getargspec(f))
        except (AttributeError, TypeError):
            fid = (f.__name__, repr(type(f)))

        def _f(*args, **kwargs):
            key = (fid, args, kwargs)

            # check if we have cached the result
            if key in self:
                result = self[key]

                # adding a null guard
                if result is None:
                    # cherrypy.log.error("[CACHE] Cache key error adding object to cache.")
                    result = f(*args, **kwargs)
                    self[key] = result

            # we have not cached the result so lets get it
            else:
                # cherrypy.log.error("[CACHE] NOT found in cache")
                result = f(*args, **kwargs)
                self[key] = result
            return result

        return _f

    def expire(self, digest_hash):
        """
        Permanently removes the item, both in the memory and in the filesystem.
        """

        # remove from filesystem
        if digest_hash in self.fs_keys:
            self._remove(digest_hash)

        # remove from memoruy
        if digest_hash in self.v_keys:

            try:
                del self[digest_hash]
            except CacheError as e:
                cherrypy.log.error("[CACHE] error deleting item %s" % str(e))

    def _remove(self, digest):
        """
        Removes the cache item keyed by `key` from the file system.
        """

        path = os.path.join(self._fs_cache_path, digest)
        if os.path.exists(path):
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
            del self._loaded[digest]

    def load(self, key):
        """
        Causes the object keyed by `k` to be loaded from the
        file system and returned. It therefore causes this object
        to reside in memory (if it exists in the cache).
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

        # load from file, if possible
        path = os.path.join(self._fs_cache_path, digest)
        if os.path.exists(path):

            # cherrypy.log.error("[CACHE] %s fs path cache found" % (path))
            contents = self.read(path)

        else:
            msg = "[CACHE] Object for key `%s` does not exist." % (k,)
            raise CacheError(msg)

        # store in cache
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
        return list(self._loaded.keys())

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

        # check for slycat path
        self.check_fs_path()

        # remove expired files from cache
        for f in os.listdir(self._fs_cache_path):
            path = os.path.join(self._fs_cache_path, f)

            try:
                contents = self.read(path)

                if contents.expired():
                    cherrypy.log.error(
                        "[CACHE] expired content found -- deleting %s." % f
                    )
                    self.expire(f)

            except CacheError as e:
                cherrypy.log.error("[CACHE] error deleting item %s." % str(e))

        # remove expired items from memory (should have been removed by above)
        for key in self.v_keys:
            if self._loaded[key].expired():
                self.expire(key)

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

        digest_hash = hashlib.sha256(str(key).encode()).digest()
        b64_digest_hash = str(base64.urlsafe_b64encode(digest_hash)[:-2])
        return b64_digest_hash.replace("-", "=")

    def read(self, filename):
        """
        Helper function that simply pickle loads the first object
        from the file named by `filename`.
        """

        with self.lock:

            # load file or raise exception
            try:
                with open(filename, "rb") as loaded_file:
                    loaded_obj = pickle.load(loaded_file)

            except Exception as e:
                msg = "[CACHE] Cache read file error %s." % str(e)
                raise CacheError(msg)

        return loaded_obj

    def write(self, obj, filename):
        """
        writes an object to the selected file path
        """

        with self.lock:

            try:
                with open(filename, "wb") as cache_file:
                    pickle.dump(obj, cache_file, protocol=pickle.HIGHEST_PROTOCOL)

            except Exception as e:
                msg = "[CACHE] Write error failure %s." % str(e)
                raise CacheError(msg)

    # all the remaining methods deal with time stamp conversion
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

        time_converter_map = {
            "years": Cache.years_to_seconds,
            "months": Cache.months_to_seconds,
            "weeks": Cache.weeks_to_seconds,
            "days": Cache.days_to_seconds,
            "hours": Cache.hours_to_seconds,
            "minutes": Cache.minutes_to_seconds,
            "seconds": Cache.seconds_to_seconds,
        }

        # converts keywords arguments to seconds
        seconds = []

        for key, value in list(kwargs.items()):
            if key in time_converter_map:
                seconds.append(time_converter_map[key](value))
            else:
                msg = "invalid time argument: %s" % key
                raise TimeError(msg)

        return sum(seconds)


# using main to test Cache code
if __name__ == "__main__":

    # starting cache tests
    print()
    print("Testing cache.py")
    print("================")

    # remove cache
    # cache = Cache("cache/dir")
    # cache.purge()

    # test time calculations
    assert (
        Cache.to_seconds(seconds=1, minutes=1) == 61
    ), "time is not calculated correctly should be 61"
    assert (
        Cache.to_seconds(
            seconds=1, minutes=1, hours=1, days=1, weeks=1, months=1, years=1
        )
        == 34881501.0
    ), "time is not calculated correctly should be 34881501.0"
    try:
        Cache.to_seconds(not_a_key=1, minutes=1)
    except TimeError as e:
        assert str(e) == "invalid time argument: not_a_key", "did not catch bad key"

    # create cache in cache/dir, expires in 20 seconds
    cache = Cache("cache/dir", seconds=20)

    # create cache function
    @cache
    def test(seed=1):
        """
        test function
        :param seed: some garbage number
        :return: seed + test + random in a string
        """

        import random

        print("test(): not cached")
        return str(seed) + " test " + str(random.random())

    # cache should be empty
    print("Retrieving non-existing value from cache: ")
    print(cache["bark"])
    print()

    # test cache function
    print("Calling cache function 'test()':")
    print(test())
    print()

    # test cache function with different seeds
    print("Calling cache function test(seed=2):")
    print((test(seed=2)))
    print()

    print("Calling cache function test(seed=3):")
    print((test(seed=3)))
    print()

    # add item to cache
    print("Adding {'meow': 'xyz'} to cache.")
    cache["meow"] = "xyz"
    print("Retrieving 'meow': " + cache["meow"])
    print()

    # change item in cache
    print("Adding {'meow': 'rgb'} to cache.")
    cache["meow"] = "rgb"
    print("Retrieving 'meow': " + cache["meow"])
    print()

    # adding empty value to cache
    try:
        empty_obj = cache.read("cache/dir/no-object.pkl")
    except CacheError:
        print("Failed to load non-existing cache file.\n")

    # load from cache
    meow = cache.load("meow")
    print("Loading 'meow' from cache.")
    print(meow)
    print()

    # print hash keys
    print("Virtual hash keys:")
    print(cache.v_keys)
    print()

    # print has keys fs
    print("Filesystem hash keys:")
    print(cache.fs_keys)
    print()

    # load expired from cache
    cache.expire(cache.digest_hash("meow"))
    meow = cache.load("meow")
    print("Loading non-existent key from cache.")
    print(meow)
    print()
