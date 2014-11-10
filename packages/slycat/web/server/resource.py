# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import hashlib
import os
import threading

class Manager(object):
  """Manages resource bundles."""
  def __init__(self):
    self._bundles = {}
    self._bundles_lock = threading.Lock()

  def create_bundle(self, content_type, resources):
    key_hash = hashlib.md5()
    key_hash.update(content_type)
    content = ""

    cherrypy.log.error("Bundling")
    for resource in resources:
      resource_path = resource["path"]
      if not os.path.isabs(resource_path):
        resource_path = os.path.join(cherrypy.tree.apps[""].config["slycat"]["root-path"], resource_path)
      cherrypy.log.error("  %s" % resource_path)
      cherrypy.engine.autoreload.files.add(resource_path)
      resource_content = open(resource_path, "rb").read()
      key_hash.update(resource_content)
      content += resource_content

    key = key_hash.hexdigest()
    self._bundles[key] = (content_type, content)
    cherrypy.log.error("  as %s" % key)

    return key

  def bundle(self, key):
    if key not in self._bundles:
      raise cherrypy.HTTPError("404 Unknown bundle.")
    return self._bundles[key]

manager = Manager()
