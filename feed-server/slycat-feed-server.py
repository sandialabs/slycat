import couch
import datetime
import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.websocket

class ProjectsFeed(tornado.websocket.WebSocketHandler):
  clients = set()

  def open(self, *args, **kwargs):
    print("WebSocket opened %s %s" % (args, kwargs))
    tid = self.get_query_argument("ticket")
    database = couch.BlockingCouch("slycat")
    ticket = database.get_doc(tid)
    print "Ticket", ticket

    self.write_message("a");
    self.write_message("b");
    self.write_message("c");
    ProjectsFeed.clients.add(self)

  def on_message(self, message):
    pass

  def on_close(self):
    print("WebSocket closed %s %s" % (self.close_code, self.close_reason))
    ProjectsFeed.clients.discard(self)

application = tornado.web.Application([
  ("/projects-feed", ProjectsFeed),
], debug=True)

def tick():
  timestamp = datetime.datetime.utcnow().isoformat()
  for client in ProjectsFeed.clients:
    client.write_message(timestamp)

if __name__ == "__main__":
  tornado.options.parse_command_line()
  server = tornado.httpserver.HTTPServer(application, ssl_options={"certfile":"../web-server/web-server.pem", "keyfile":"../web-server/web-server.key"})
  server = tornado.httpserver.HTTPServer(application)
  server.listen(8888)

  tornado.ioloop.PeriodicCallback(tick, 2000).start()
  tornado.ioloop.IOLoop.instance().start()

