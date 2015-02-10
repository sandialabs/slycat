import sys
import tornado.websocket
from tornado import gen


@gen.coroutine
def test_ws():
  client = yield tornado.websocket.websocket_connect("ws://localhost:8888/websocket/client-ticket")
  while True:
    message = yield client.read_message()
    if message is None:
      break
    sys.stderr.write("%s\n" % message)
    sys.stderr.flush()

tornado.ioloop.IOLoop.instance().run_sync(test_ws)
