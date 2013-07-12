# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import os
import pystache

def render(path, context):
  template_path = os.path.join(cherrypy.tree.apps[""].config["slycat"]["server-resources"], "templates")
  pystache.View.template_path = template_path
  template = os.path.join(template_path, path)
  return pystache.render(open(template, "r").read(), context)
