import argparse
import json
import slycat.web.client
import sys
import tornado.websocket

parser = slycat.web.client.ArgumentParser()
parser.add_argument("--feed-host", default="wss://localhost", help="Root URL of the feed server.  Default: %(default)s")
parser.add_argument("--format", choices=["raw", "summary"], default="summary", help="Output data format.  Default: %(default)s")
arguments = parser.parse_args()

def format_raw(message, stream):
  stream.write("%s\n" % message)

def format_summary(message, stream):
  change = json.loads(message)
  if "deleted" in change:
    stream.write("  delete %s\n" % change["id"])
  else:
    if change["doc"]["type"] == "project":
      stream.write("p update %s\n" % change["id"])
    elif change["doc"]["type"] == "model":
      stream.write("m update %s\n" % change["id"])

if arguments.format == "raw":
  formatter = format_raw
elif arguments.format == "summary":
  formatter = format_summary

connection = slycat.web.client.connect(arguments)
tid = connection.get_ticket()

@tornado.gen.coroutine
def watch_feed():
  websocket = yield tornado.websocket.websocket_connect(arguments.feed_host + "/changes-feed?ticket=" + tid)
  while True:
    message = yield websocket.read_message()
    if message is None:
      break
    formatter(message, sys.stdout)
    sys.stdout.flush()

try:
  tornado.ioloop.IOLoop.instance().run_sync(watch_feed)
except KeyboardInterrupt:
  tornado.ioloop.IOLoop.instance().stop()
