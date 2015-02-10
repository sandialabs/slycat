import tornado.ioloop
import tornado.web
import tornado.websocket

class EchoWebSocket(tornado.websocket.WebSocketHandler):
  def open(self):
    print("WebSocket opened")
    self.write_message("foo");
    self.write_message("bar");
    self.write_message("baz");

  def on_message(self, message):
    self.write_message(u"You said: " + message)

  def on_close(self):
    print("WebSocket closed")

class MainHandler(tornado.web.RequestHandler):
  def get(self):
    self.write("""
<html>
  <head>
  </head>
  <body>
    <h1>Hello, World!</h1>
    <script type="application/javascript">
      var ws = new WebSocket("ws://192.168.59.103:8888/websocket");
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
  ("/websocket", EchoWebSocket),
])

if __name__ == "__main__":
  application.listen(8888)
  tornado.ioloop.IOLoop.instance().start()
