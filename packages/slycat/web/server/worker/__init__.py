# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import datetime
import threading
import time
import traceback
import uuid

class pool_implementation:
  """Manages a pool of running workers."""
  def __init__(self):
    self.collection_lock = threading.Lock()
    self.collection = {}

    self.revision_lock = threading.Lock()
    self.revision = 0
    self.changed = threading.Condition()

  def update(self):
    """Called internally whenever watchers should be notified of a change to worker state."""
    with self.revision_lock:
      self.revision += 1
    with self.changed:
      self.changed.notify_all()

  def start_worker(self, worker):
    """Called to start a new worker."""
    id = uuid.uuid4().hex

    worker.status["_id"] = id
    worker.daemon = True
    worker.pool = self

    with self.collection_lock:
      self.collection[id] = worker
      worker.start()

    return id

  def delete(self, id):
    """Called to delete an existing worker."""
    with self.collection_lock:
      if id in self.collection:
        self.collection[id].stop()
        del self.collection[id]
    self.update()

  def workers(self, revision, timeout):
    """Called to return the set of all workers."""
    start_time = time.time()
    while revision == self.revision:
      with self.changed:
        self.changed.wait(1.0)
      if time.time() - start_time > timeout:
        return None
    return self.revision, self.collection.values()

  def worker(self, id):
    """Called to return a single worker if it exists, or None."""
    return self.collection[id] if id in self.collection else None

pool = pool_implementation()

class prototype(threading.Thread):
  """Base class for workers."""
  def __init__(self, security, name):
    threading.Thread.__init__(self, name=name)

    self.security = security

    self.stopped = False

    self.status = {
      "_id" : None,
      "creator" : self.security["user"],
      "finished" : None,
      "message" : None,
      "name" : name,
      "result" : None,
      "started" : datetime.datetime.utcnow().isoformat(),
      }
    self.status_lock = threading.Lock()

  def endpoint_get(self, arguments):
    cherrypy.log.error("GET worker endpoint: %s" % arguments)
    raise cherrypy.HTTPError("400 Not implemented by this worker.")

  def endpoint_put(self, arguments):
    cherrypy.log.error("PUT worker endpoint: %s" % arguments)
    raise cherrypy.HTTPError("400 Not implemented by this worker.")

  def endpoint_post(self, arguments):
    cherrypy.log.error("POST worker endpoint: %s" % arguments)
    raise cherrypy.HTTPError("400 Not implemented by this worker.")

  def run(self):
    try:
      self.work()
      if self.stopped:
        with self.status_lock:
          self.status["finished"] = datetime.datetime.utcnow().isoformat()
          self.status["result"] = "stopped"
      else:
        with self.status_lock:
          self.status["finished"] = datetime.datetime.utcnow().isoformat()
          self.status["result"] = "succeeded"
    except:
      with self.status_lock:
        self.status["message"] = traceback.format_exc()
        self.status["finished"] = datetime.datetime.utcnow().isoformat()
        self.status["result"] = "failed"
    self.pool.update()

  def work(self):
    raise NotImplementedError()

  def stop(self):
    self.stopped = True

  def set_message(self, message):
    self.set_status("message", message, "")

  def set_uri(self, uri):
    self.set_status("uri", uri, "")

  def set_progress(self, progress):
    self.set_status("progress", progress, "")

  def mix(self, a, b, amount):
    return ((1.0 - amount) * a) + (amount * b)

  def set_status(self, key, value, namespace="worker:"):
    with self.status_lock:
      self.status[namespace + key] = value
    self.pool.update()

