# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

# External dependencies
import PIL.Image

# Python standard library
import argparse
import cStringIO as StringIO
import json
import mimetypes
import os
import re
import stat
import subprocess
import sys

def browse(command):
  if "path" not in command:
    raise Exception("Missing path.")
  path = command["path"]
  if not os.path.isabs(path):
    raise Exception("Path must be absolute.")
  if not os.path.exists(path):
    raise Exception("No such file or directory.")

  file_reject = re.compile(command.get("file-reject")) if "file-reject" in command else None
  file_allow = re.compile(command.get("file-allow")) if "file-allow" in command else None
  directory_reject = re.compile(command.get("directory-reject")) if "directory-reject" in command else None
  directory_allow = re.compile(command.get("directory-allow")) if "directory-allow" in command else None

  if os.path.isdir(path):
    names = sorted(os.listdir(path))
  else:
    path, name = os.path.split(path)
    names = [name]

  listing = {
    "path":path,
    "names":[],
    "sizes":[],
    "types":[],
    }

  for name in names:
    fpath = os.path.join(path, name)
    fstat = os.stat(fpath)
    ftype = "d" if stat.S_ISDIR(fstat.st_mode) else "f"

    if ftype == "d":
      if directory_reject is not None and directory_reject.search(fpath) is not None:
        if directory_allow is None or directory_allow.search(fpath) is None:
          continue

    if ftype == "f":
      if file_reject is not None and file_reject.search(fpath) is not None:
        if file_allow is None or file_allow.search(fpath) is None:
          continue

    listing["names"].append(name)
    listing["sizes"].append(fstat.st_size)
    listing["types"].append(ftype)

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
  requested_content_type = command.get("content-type", file_content_type[0])

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

def get_video(command, arguments):
  if "images" not in command:
    raise Exception("Missing images.")
  if "content-type" not in command:
    raise Exception("Missing content-type.")

  if arguments.ffmpeg is None:
    raise Exception("ffmpeg not configured.")

  if command["content-type"] not in ["video/mp4", "video/webm"]:
    raise Exception("Unsupported video type.")

  ffmpeg_command = [arguments.ffmpeg, "-y"]
  ffmpeg_command += ["-c", "jpeg"]
  for image in command["images"]:
    ffmpeg_command.append("-i")
    ffmpeg_command.append(image)
  ffmpeg_command.append("-pix_fmt")
  ffmpeg_command.append("yuv420p")
  ffmpeg_command.append("test.mp4")
  sys.stderr.write("%s\n" % " ".join(ffmpeg_command))
  subprocess.call(ffmpeg_command)

  content = StringIO.StringIO()
  sys.stdout.write("%s\n" % json.dumps({"message":"Video retrieved.", "content-type":[command["content-type"], None], "size":len(content.getvalue())}))
  sys.stdout.flush()

def main():
  # Parse and sanity-check command-line arguments.
  parser = argparse.ArgumentParser()
  parser.add_argument("--ffmpeg", default=None, help="Absolute path to an ffmpeg executable.")
  arguments = parser.parse_args()

  if arguments.ffmpeg is not None:
    if not os.path.isabs(arguments.ffmpeg):
      sys.stdout.write("%s\n" % json.dumps({"message":"--ffmpeg must specify an absolute path."}))
      return
    if not os.path.exists(arguments.ffmpeg):
      sys.stdout.write("%s\n" % json.dumps({"message":"--ffmpeg must specify an existing file."}))
      return

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
      elif action == "get-video":
        get_video(command, arguments)
      else:
        raise Exception("Unknown command.")
    except Exception as e:
      sys.stdout.write("%s\n" % json.dumps({"message":e.message}))
      sys.stdout.flush()

if __name__ == "__main__":
  main()
