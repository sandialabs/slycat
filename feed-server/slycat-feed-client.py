import argparse
import sys
import tornado.websocket

parser = argparse.ArgumentParser(description="Monitor a Slycat server feed.")
parser.add_argument("--host", default="ws://localhost:8888", help="Root URL of the feed server.  Default: %(default)s")
arguments = parser.parse_args()

@tornado.gen.coroutine
def watch_feed():
  client = yield tornado.websocket.websocket_connect(arguments.host + "/websocket/client-ticket")
  while True:
    message = yield client.read_message()
    if message is None:
      break
    sys.stdout.write("%s\n" % message)
    sys.stdout.flush()

try:
  tornado.ioloop.IOLoop.instance().run_sync(watch_feed)
except KeyboardInterrupt:
  tornado.ioloop.IOLoop.instance().stop()
