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
import tempfile
import threading
import uuid

session_cache = {}

class VideoSession(threading.Thread):
  def __init__(self, ffmpeg, content_type, images):
    threading.Thread.__init__(self)
    self._ffmpeg = ffmpeg
    self._content_type = content_type
    self._images = images
    self._result = None
    self._failed = None
  def run(self):
    try:
      fd, path = tempfile.mkstemp(suffix=mimetypes.guess_extension(self._content_type, strict=False))
      os.close(fd)
      command = [self._ffmpeg, "-y"]
      command += ["-f", "concat"]
      command += ["-i", "-"]
      command.append(path)
      ffmpeg = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
      for image in self._images:
        ffmpeg.stdin.write("file %s\n" % image)
      stdout, stderr = ffmpeg.communicate()
      self._result = path
    except Exception as e:
      self._failed = e
  @property
  def content_type(self):
    return self._content_type
  @property
  def result(self):
    return self._result
  @property
  def failed(self):
    return self._failed

# Handle the 'browse' command.
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

# Handle the 'get-file' command.
def get_file(command):
  if "path" not in command:
    raise Exception("Missing path.")
  try:
    content = open(command["path"], "rb").read()
  except IOError as e:
    raise Exception(e.strerror + ".")
  content_type, encoding = mimetypes.guess_type(command["path"], strict=False)
  sys.stdout.write("%s\n%s" % (json.dumps({"message":"File retrieved.", "path":command["path"], "content-type":content_type, "size":len(content)}), content))
  sys.stdout.flush()

# Handle the 'get-image' command.
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
  sys.stdout.write("%s\n%s" % (json.dumps({"message":"Image retrieved.", "path":path, "content-type":requested_content_type, "size":len(content.getvalue())}), content.getvalue()))
  sys.stdout.flush()

# Handle the 'create-video' command.
def create_video(command, arguments):
  if arguments.ffmpeg is None:
    raise Exception("ffmpeg not configured.")
  if "content-type" not in command:
    raise Exception("Missing content-type.")
  if command["content-type"] not in ["video/mp4", "video/webm"]:
    raise Exception("Unsupported video type.")
  if "images" not in command:
    raise Exception("Missing images.")

  sid = uuid.uuid4().hex
  session_cache[sid] = VideoSession(arguments.ffmpeg, command["content-type"], command["images"])
  session_cache[sid].start()

  sys.stdout.write("%s\n" % json.dumps({"message":"Creating video.", "sid":sid}))
  sys.stdout.flush()

def video_status(command, arguments):
  if "sid" not in command:
    raise Exception("Missing session id.")
  if command["sid"] not in session_cache:
    raise Exception("Unknown session id.")
  session = session_cache[command["sid"]]
  if not isinstance(session, VideoSession):
    raise Exception("Not a video session.")
  if session.failed is not None:
    raise Exception("Video creation failed: %s" % session.failed)
  if session.result is None:
    raise Exception("Not ready.")
  sys.stdout.write("%s\n" % json.dumps({"message":"Video ready."}))
  sys.stdout.flush()

def get_video(command, arguments):
  if "sid" not in command:
    raise Exception("Missing session id.")
  if command["sid"] not in session_cache:
    raise Exception("Unknown session id.")
  session = session_cache[command["sid"]]
  if not isinstance(session, VideoSession):
    raise Exception("Not a video session.")
  if session.failed is not None:
    raise Exception("Video creation failed: %s" % session.failed)
  if session.result is None:
    raise Exception("Not ready.")
  content = open(session.result, "rb").read()
  sys.stdout.write("%s\n%s" % (json.dumps({"message":"Video retrieved.", "content-type":session.content_type, "size":len(content)}), content))
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
  mimetypes.add_type("video/webm", ".webm", strict=False)

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
      elif action == "create-video":
        create_video(command, arguments)
      elif action == "video-status":
        video_status(command, arguments)
      elif action == "get-video":
        get_video(command, arguments)
      else:
        raise Exception("Unknown command.")
    except Exception as e:
      sys.stdout.write("%s\n" % json.dumps({"message":e.message}))
      sys.stdout.flush()

if __name__ == "__main__":
  main()
