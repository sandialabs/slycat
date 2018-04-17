# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import cherrypy

def serve(stream, size, content_type):
  cherrypy.response.headers["accept-ranges"] = "bytes"
  cherrypy.response.headers["content-type"] = content_type
  if "range" in cherrypy.request.headers:
    cherrypy.response.headers["content-range"] = "bytes 0-%s/%s" % (size-1, size)
    cherrypy.response.status = "206"
  else:
    cherrypy.response.status = "200"
  content = stream.read(size)
  return content
