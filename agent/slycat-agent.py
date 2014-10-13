# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import PIL.Image
import cStringIO as StringIO
import json
import mimetypes
import os
import stat
import sys

def browse(command):
  if "path" not in command:
    raise Exception("Missing path.")
  path = command["path"]
  if not os.path.isabs(path):
    raise Exception("Path must be absolute.")
  if not os.path.exists(path):
    raise Exception("No such file or directory.")
  listing = {
    "path":path,
    "names":[],
    "sizes":[],
    "types":[],
    }
  if os.path.isdir(path):
    for name in sorted(os.listdir(path)):
      fstat = os.stat(os.path.join(path, name))
      listing["names"].append(name)
      listing["sizes"].append(fstat.st_size)
      listing["types"].append("d" if stat.S_ISDIR(fstat.st_mode) else "f")
  else:
    fstat = os.stat(path)
    listing["names"].append(os.path.basename(path))
    listing["sizes"].append(fstat.st_size)
    listing["types"].append("f")
  sys.stdout.write("%s\n" % json.dumps(listing))
  sys.stdout.flush()

def get_file(command):
  if "path" not in command:
    raise Exception("Missing path.")
  try:
    content = open(command["path"], "rb").read()
  except IOError as e:
    raise Exception(e.strerror + ".")
  sys.stdout.write("%s\n%s" % (json.dumps({"message":"File retrieved.", "path":command["path"], "content-type":mimetypes.guess_type(command["path"], strict=False), "size":len(content)}), content))
  sys.stdout.flush()

def get_image(command):
  if "path" not in command:
    raise Exception("Missing path.")
  path = command["path"]
  file_content_type = mimetypes.guess_type(path)
  requested_content_type = command.get("content-type", file_content_type)

  # Optional fast path if the client hasn't requested anything that would alter the image contents:
  if "max-size" not in command and "max-width" not in command and "max-height" not in command and requested_content_type == file_content_type:
    get_file(command)

  if requested_content_type not in ["image/jpeg", "image/png"]:
    raise Exception("Unsupported image type.")

  # Load the requested image.
  try:
    image = PIL.Image.open(path)
  except IOError as e:
    raise Exception(e.strerror + ".")

  # Optionally downsample the image.
  size = image.size
  if "max-size" in command:
    size = (command["max-size"], command["max-size"])
  if "max-width" in command:
    size = (command["max-width"], size[1])
  if "max-height" in command:
    size = (size[0], command["max-height"])
  if size != image.size:
    image.thumbnail(size=size, resample=PIL.Image.ANTIALIAS)

  # Save the image to the requested format.
  content = StringIO.StringIO()
  if requested_content_type == "image/jpeg":
    image.save(content, "JPEG")
  elif requested_content_type == "image/png":
    image.save(content, "PNG")

  # Send the results back to the caller.
  sys.stdout.write("%s\n%s" % (json.dumps({"message":"Image retrieved.", "path":path, "content-type":[requested_content_type, None], "size":len(content.getvalue())}), content.getvalue()))
  sys.stdout.flush()

if __name__ == "__main__":
  # Setup some nonstandard MIME types.
  mimetypes.add_type("text/csv", ".csv", strict=False)

  # Let the caller know we're ready to handle commands.
  sys.stdout.write("%s\n" % json.dumps({"message":"Ready."}))
  sys.stdout.flush()

  while True:
    # Read the next command from caller.
    command = sys.stdin.readline()
    if command == "": # EOF means the caller went away and it's time to shut-down.
      break

    try:
      # Parse the command, which must be a JSON object containing an action.
      try:
        command = json.loads(command)
      except:
        raise Exception("Not a JSON object.")
      if not isinstance(command, dict):
        raise Exception("Not a JSON object.")
      if not "action" in command:
        raise Exception("Missing action.")

      action = command["action"]
      if action == "browse":
        browse(command)
      elif action == "get-file":
        get_file(command)
      elif action == "get-image":
        get_image(command)
      else:
        raise Exception("Unknown command.")
    except Exception as e:
      sys.stdout.write("%s\n" % json.dumps({"message":e.message}))
      sys.stdout.flush()
