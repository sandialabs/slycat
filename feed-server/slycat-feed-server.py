import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.websocket

class EchoWebSocket(tornado.websocket.WebSocketHandler):
  def open(self, *args, **kwargs):
    print("WebSocket opened %s %s" % (args, kwargs))
    self.write_message("foo");
    self.write_message("bar");
    self.write_message("baz");

  def on_message(self, message):
    self.write_message(u"You said: " + message)

  def on_close(self):
    print("WebSocket closed %s %s" % (self.close_code, self.close_reason))

class MainHandler(tornado.web.RequestHandler):
  def get(self):
    self.write("""
<html>
  <head>
    <title>Slycat Feed Server</title>
  </head>
  <body>
    <h1>Hello, World!</h1>
    <script type="application/javascript">
      var ws = new WebSocket("wss://192.168.59.103:8888/websocket/myticket");
      ws.onopen = function()
      {
        ws.send("Hello, world");
      };
      ws.onmessage = function (evt)
      {
        console.log(evt.data);
      };
    </script>
  </body>
</html>
""")

application = tornado.web.Application([
  (r"/", MainHandler),
  ("/websocket/(.*)", EchoWebSocket),
], debug=True)

if __name__ == "__main__":
  tornado.options.parse_command_line()
  server = tornado.httpserver.HTTPServer(application, ssl_options={"certfile":"../web-server/web-server.pem", "keyfile":"../web-server/web-server.key"})
  server = tornado.httpserver.HTTPServer(application)
  server.listen(8888)
  tornado.ioloop.IOLoop.instance().start()

