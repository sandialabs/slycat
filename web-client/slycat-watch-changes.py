# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import argparse
import json
import os
import slycat.web.client
import sys
import tornado.httpclient
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

# Connect to Slycat and issue an HTTP request to force session creation.
connection = slycat.web.client.connect(arguments)
connection.get_configuration_version()

# We want Tornado to behave like requests.
websocket_ca = arguments.verify if arguments.verify is not None else os.environ.get("REQUESTS_CA_BUNDLE", None)

@tornado.gen.coroutine
def watch_feed():
  request = tornado.httpclient.HTTPRequest(
    arguments.feed_host + "/changes-feed",
    validate_cert=not arguments.no_verify,
    ca_certs=websocket_ca,
    headers={"cookie": "slycatauth=" + connection.session.cookies["slycatauth"]},
    )
  websocket = yield tornado.websocket.websocket_connect(request)
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
