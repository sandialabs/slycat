# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import cherrypy
import os
import pystache

def render(path, context):
  """Render an HTML template using `Mustache <http://mustache.github.io>`_ syntax."""
  if render.templates is None:
    render.templates = cherrypy.tree.apps[""].config["/templates"]["tools.staticdir.dir"]
  if render.renderer is None:
    render.renderer = pystache.Renderer(search_dirs = render.templates)
  return render.renderer.render(open(os.path.join(render.templates, path), "r").read(), context)
render.templates = None
render.renderer = None
