import cherrypy
import time

class Root():
  @cherrypy.expose
  def index(self):
    return open("index.html", "r").read()

  @cherrypy.expose
  def time(self):
    cherrypy.response.headers["content-type"] = "text/event-stream"
    def content():
      while True:
        yield "\ndata: %s\n" % time.time()
        time.sleep(2)
    return content()
  time._cp_config = {"response.stream": True}

cherrypy.quickstart(Root(), '/', config={})

