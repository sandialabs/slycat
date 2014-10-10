# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import json
import sys

def get_image(command):
  return "<image here>\n"

sys.stdout.write("%s\n" % json.dumps({"message":"ready"}))
while True:
  command = sys.stdin.readline()
  try:
    command = json.loads(command)
    action = command.get("action")
    if action == "get-image":
      sys.stdout.write(get_image(command))
    elif action == "exit":
      sys.stdout.write("%s\n" % json.dumps({"message":"exiting"}))
      break
  except Exception as e:
    sys.stdout.write("%s\n" % json.dumps({"message":e.message}))

