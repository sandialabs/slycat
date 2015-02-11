import argparse
import sys
import tornado.websocket

parser = argparse.ArgumentParser(description="Monitor a Slycat server feed.")
parser.add_argument("--host", default="ws://localhost:8093", help="Root URL of the feed server.  Default: %(default)s")
parser.add_argument("--ticket", default="10327d9078b84706b5a274e5c3b39038", help="Authentication ticket.  Default: %(default)s")
arguments = parser.parse_args()

@tornado.gen.coroutine
def watch_feed():
  project = yield tornado.websocket.websocket_connect(arguments.host + "/projects-feed?ticket=" + arguments.ticket)
  while True:
    message = yield project.read_message()
    if message is None:
      break
    sys.stdout.write("%s\n" % message)
    sys.stdout.flush()

try:
  tornado.ioloop.IOLoop.instance().run_sync(watch_feed)
except KeyboardInterrupt:
  tornado.ioloop.IOLoop.instance().stop()
