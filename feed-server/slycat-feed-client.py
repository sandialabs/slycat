import argparse
import slycat.web.client
import sys
import tornado.websocket

parser = slycat.web.client.ArgumentParser()
parser.add_argument("--feed-host", default="ws://localhost:8093", help="Root URL of the feed server.  Default: %(default)s")
parser.add_argument("feed", default="projects", choices=["projects", "models"], help="The feed to monitor.  Default: %(default)s")
arguments = parser.parse_args()

connection = slycat.web.client.connect(arguments)
tid = connection.get_ticket()

@tornado.gen.coroutine
def watch_feed():
  if arguments.feed == "projects":
    websocket = yield tornado.websocket.websocket_connect(arguments.feed_host + "/projects-feed?ticket=" + tid)
  elif arguments.feed == "models":
    websocket = yield tornado.websocket.websocket_connect(arguments.feed_host + "/models-feed?ticket=" + tid)
  while True:
    message = yield websocket.read_message()
    if message is None:
      break
    sys.stdout.write("%s\n" % message)
    sys.stdout.flush()

try:
  tornado.ioloop.IOLoop.instance().run_sync(watch_feed)
except KeyboardInterrupt:
  tornado.ioloop.IOLoop.instance().stop()
