# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import time
import slycat.web.server.worker

class countdown(slycat.web.server.worker.prototype):
  """Worker that counts-down a given number of seconds before running a
  callback and exiting."""
  def __init__(self, security, name, seconds, callback, uri=None):
    slycat.web.server.worker.prototype.__init__(self, security, name)
    self.seconds = seconds
    self.callback = callback
    self.uri = uri

  def work(self):
    self.set_progress(0.0)

    for i in range(self.seconds):
      if self.stopped:
        return
      self.set_progress(float(i) / float(self.seconds))
      self.set_message("%s seconds remaining." % (self.seconds - i))
      time.sleep(1)

    if self.uri is not None:
      self.set_uri(self.uri)

    self.set_progress(1.0)
    self.set_message("Complete.")
    self.callback()

