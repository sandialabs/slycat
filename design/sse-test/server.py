import cherrypy
import datetime
import json
import numpy
import os
import threading
import Queue
import time

birds = []
birdmap = {}
observers = []

def update_birds():
  global birds, birdmap
  for id in range(10):
    birdmap[id] = {"id":id, "rev":0}
    birds.append(birdmap[id])
  while cherrypy.engine.state not in [cherrypy.engine.states.STOPPING, cherrypy.engine.states.EXITING]:
    id = numpy.random.choice(10)
    operation = numpy.random.choice(["remove"] + ["update"] * 10)
    if operation == "remove":
      if id in birdmap:
        birds.remove(birdmap[id])
        del birdmap[id]
        operation = json.dumps({"remove":{"id":id}})
        cherrypy.log.error("%s" % operation)
        for observer in observers:
          observer.put(operation)
    else:
      if id in birdmap:
        birdmap[id]["rev"] += 1
      else:
        birdmap[id] = {"id":id, "rev":0}
        birds.append(birdmap[id])
      operation = json.dumps({"update":birdmap[id]})
      cherrypy.log.error("%s" % operation)
      for observer in observers:
        observer.put(operation)
    time.sleep(1)
  cherrypy.log.error("Stopping update_birds thread.")

thread = threading.Thread(target=update_birds)
thread.start()

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
      cherrypy.log.error("Stopping time handler.")
    return content()
  time._cp_config = {"response.stream": True}

  @cherrypy.expose
  def birds(self):
    cherrypy.response.headers["content-type"] = "text/event-stream"
    def content():
      # Register to receive updates to the list.
      queue = Queue.Queue()
      observers.append(queue)

      # Send the initial state of the list.
      yield "data: %s\n\n" % json.dumps({"clear":True})
      for bird in birds:
        yield "data: %s\n\n" % json.dumps({"update":bird})

      # Send incremental updates as they happen.
      while cherrypy.engine.state == cherrypy.engine.states.STARTED:
        try:
          operation = queue.get(timeout=2.0)
          yield "data: %s\n\n" % operation
        except:
          yield ":\n\n"
      cherrypy.log.error("Stopping birds handler.")
    return content()
  birds._cp_config = {"response.stream": True}

cherrypy.quickstart(Root(), '/', config={
  "/js" : {
    "tools.staticdir.dir" : os.path.abspath("js"),
    "tools.staticdir.on" : True,
    }
  })

