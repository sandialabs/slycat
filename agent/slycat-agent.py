# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import json
import sys

def get_image(command):
  if "path" not in command:
    raise Exception("Missing path.")
  image = "<image here>"
  return "%s\n%s" % (json.dumps({"message":"Image retrieved.", "path":command["path"], "size":len(image)}), image)

sys.stdout.write("%s\n" % json.dumps({"message":"Ready."}))
while True:
  command = sys.stdin.readline()
  try:
    try:
      command = json.loads(command)
    except:
      raise Exception("Not a JSON object.")
    if not isinstance(command, dict):
      raise Exception("Not a dict.")
    action = command.get("action")
    if action == "get-image":
      sys.stdout.write(get_image(command))
    elif action == "exit":
      sys.stdout.write("%s\n" % json.dumps({"message":"Exiting."}))
      break
  except Exception as e:
    sys.stdout.write("%s\n" % json.dumps({"message":e.message}))

