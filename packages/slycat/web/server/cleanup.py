# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import datetime
import Queue
import slycat.web.server.database.couchdb
import slycat.web.server.hdf5
import slycat.web.server
import threading
import time
import sys
import cPickle

def _array_cleanup_worker():
  cherrypy.log.error("Started array cleanup worker.")
  while True:
    arrays.queue.get()
    while True:
      try:
        database = slycat.web.server.database.couchdb.connect()
        cherrypy.log.error("Array cleanup worker running.")
        for file in database.view("slycat/hdf5-file-counts", group=True):
          if file.value == 0:
            slycat.web.server.hdf5.delete(file.key)
            database.delete(database[file.key])
        cherrypy.log.error("Array cleanup worker finished.")
        break
      except Exception as e:
        cherrypy.log.error("Array cleanup worker waiting for couchdb.")
        time.sleep(2)

_array_cleanup_worker.thread = threading.Thread(name="array-cleanup", target=_array_cleanup_worker)
_array_cleanup_worker.thread.daemon = True

def _login_session_cleanup_worker():
  cherrypy.log.error("Started login session cleanup worker.")
  while True:
    try:
      database = slycat.web.server.database.couchdb.connect()
      cherrypy.log.error("Login session cleanup worker running.")
      cutoff = (datetime.datetime.utcnow() - cherrypy.request.app.config["slycat"]["session-timeout"]).isoformat()
      for session in database.view("slycat/sessions", include_docs=True):
        if session.doc["created"] < cutoff:
          database.delete(session.doc)
      cherrypy.log.error("Login session cleanup worker finished.")
      time.sleep(datetime.timedelta(minutes=15).total_seconds())
    except Exception as e:
      cherrypy.log.error("Login session cleanup worker waiting for couchdb.")
      time.sleep(2)
_login_session_cleanup_worker.thread = threading.Thread(name="session-cleanup", target=_login_session_cleanup_worker)
_login_session_cleanup_worker.thread.daemon = True

server_cache = slycat.web.server.server_cache_new
def _cache_cleanup_worker():
      import cherrypy
      cherrypy.log.error("Started server cache cleanup worker.")
      while True:
        time.sleep(datetime.timedelta(minutes=1).total_seconds())
        with server_cache.lock:
          cherrypy.log.error("running server cache-cleanup thread cache size = %s mbs" % (sys.getsizeof(cPickle.dumps(slycat.web.server.server_cache_new.cache))/1024/1024))

_cache_cleanup_worker.thread = threading.Thread(name="cache-cleanup", target=_cache_cleanup_worker)
_cache_cleanup_worker.thread.daemon = True

def _forced_cache_cleanup_worker():
      import cherrypy
      cherrypy.log.error("Started server forced cache cleanup worker.")
      while True:
        msg = server_cache.queue.get()
        with server_cache.lock:
          cherrypy.log.error("running server forced-cache-cleanup thread with: %s" % msg)

_forced_cache_cleanup_worker.thread = threading.Thread(name="forced-cache-cleanup", target=_forced_cache_cleanup_worker)
_forced_cache_cleanup_worker.thread.daemon = True

def _cache_cleanup():
  pass

def start():
  """Called to start all of the cleanup worker threads."""
  _array_cleanup_worker.thread.start()
  _login_session_cleanup_worker.thread.start()
  _cache_cleanup_worker.thread.start()
  _forced_cache_cleanup_worker.thread.start()

def arrays():
  """Request a cleanup pass for unused arrays."""
  arrays.queue.put("cleanup")
arrays.queue = Queue.Queue()
arrays.queue.put("cleanup")

