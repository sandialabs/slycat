import cherrypy
import datetime
import json
import numpy
import os
import time

class Root():
  @cherrypy.expose
  def index(self):
    return open("index.html", "r").read()

  @cherrypy.expose
  def time(self):
    cherrypy.response.headers["content-type"] = "text/event-stream"
    def content():
      while cherrypy.engine.state == cherrypy.engine.states.STARTED:
        yield "data: %s\n\n" % datetime.datetime.utcnow()
        time.sleep(1)
    return content()
  time._cp_config = {"response.stream": True}

  @cherrypy.expose
  def birds(self):
    cherrypy.response.headers["content-type"] = "text/event-stream"
    def content():
      birds = {}
      while cherrypy.engine.state == cherrypy.engine.states.STARTED:
        id = numpy.random.choice(10)
        operation = numpy.random.choice(["remove"] + ["update"] * 10)
        if operation == "remove":
          if id in birds:
            del birds[id]
            yield "data: %s\n\n" % json.dumps({"remove":{"id":id}})
        else:
          if id in birds:
            birds[id]["rev"] += 1
          else:
            birds[id] = {"rev":0}
          yield "data: %s\n\n" % json.dumps({"update":{"id":id, "rev":birds[id]["rev"]}})
        time.sleep(0.1)
    return content()
  birds._cp_config = {"response.stream": True}

cherrypy.quickstart(Root(), '/', config={
  "/js" : {
    "tools.staticdir.dir" : os.path.abspath("js"),
    "tools.staticdir.on" : True,
    }
  })

