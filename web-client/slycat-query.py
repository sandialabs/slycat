# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import slycat.web.client
import json
import sys

usage = """Usage: %prog [options] <commands>

Where <commands> is one-or-more of the following:

bookmark <project id> <json content>
print bookmark <bookmark id>
print model <model id>
print model <model id> array <artifact id>
print project <project id>
print project <project id> models
print projects
print user <user id>
print workers
print workers <revision id>
"""

parser = slycat.web.client.option_parser(usage)
options, tokens = parser.parse_args()

connection = slycat.web.client.connect(options)

def require_token():
  global tokens
  if not len(tokens):
    raise Exception("Missing expected token")
  token = tokens[0]
  tokens = tokens[1:]
  return token

def peek_token():
  global tokens
  return tokens[0] if len(tokens) else None

def skip_token():
  global tokens
  tokens = tokens[1:]

def print_response(response):
  sys.stdout.write("%s\n" % json.dumps(response, sort_keys=True, indent=2))

def print_command(target):
  if target == "projects":
    response = connection.get_projects()
  elif target == "project":
    pid = require_token()
    if peek_token() == "models":
      skip_token()
      response = connection.request("GET", "/projects/%s/models" % (pid), headers={"accept":"application/json"})
    else:
      response = connection.get_project(pid)
  elif target == "model":
    mid = require_token()
    if peek_token() == "array":
      skip_token()
      artifact = require_token()
      wid = connection.create_array_chunker(mid, artifact)
      metadata = connection.get_array_chunker_metadata(wid)
      attribute_indices = range(len(metadata["attributes"]))
      range_indices = []
      for dimension in metadata["dimensions"]:
        range_indices += [dimension["begin"], dimension["end"]]
      chunk = connection.get_array_chunker_chunk(wid, attribute_indices, range_indices)
      response = {"metadata" : metadata, "data" : chunk}
      connection.delete_worker(wid, stop=True)
    else:
      response = connection.get_model(mid)
  elif target == "user":
    uid = require_token()
    response = connection.request("GET", "/users/%s" % (uid), headers={"accept":"application/json"})
  elif target == "workers":
    if peek_token() is None:
      response = connection.request("GET", "/workers", headers={"accept":"application/json"})
    else:
      response = connection.request("GET", "/workers?revision=%s" % require_token(), headers={"accept":"application/json"})
  elif target == "bookmark":
    response = connection.get_bookmark(require_token())
  print_response(response)

def bookmark_command():
  pid = require_token()
  bookmark = require_token()
  print bookmark
  bookmark = json.loads(bookmark)
  print_response(connection.create_bookmark(pid, bookmark))

def dispatch_command(command):
  if command == "print":
    print_command(require_token())
  elif command == "bookmark":
    bookmark_command()
  else:
    raise Exception("Unknown command: %s" % command)

while len(tokens):
  dispatch_command(require_token())

