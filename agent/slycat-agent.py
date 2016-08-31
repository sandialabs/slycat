#!/bin/env python

# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

# External dependencies
import PIL.Image

# Python standard library
import argparse

try:
  import cStringIO as StringIO
except:
  import StringIO

import datetime
import errno
import json
import slycat.mime_type
import os
import re
import stat
import subprocess
import sys
import tempfile
import threading
import uuid
import multiprocessing
import time
import ConfigParser

session_cache = {}

class VideoSession(threading.Thread):
  def __init__(self, ffmpeg, content_type, images):
    threading.Thread.__init__(self)
    self.content_type = content_type
    self._images = images
    self._ffmpeg = ffmpeg
    self.exception = None
    self.stdout = None
    self.stderr = None
    self.returncode = None
    self.output = None
    self.finished = False
  def run(self):
    try:
      fd, path = tempfile.mkstemp(suffix=slycat.mime_type.guess_extension(self.content_type, strict=False))
      os.close(fd)
      command = [self._ffmpeg, "-y"]
      command += ["-f", "concat"]
      command += ["-i", "-"]
      command.append(path)
      ffmpeg = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
      for image in self._images:
        ffmpeg.stdin.write("file %s\n" % image)
      self.stdout, self.stderr = ffmpeg.communicate()
      self.returncode = ffmpeg.returncode
      self.output = path
    except Exception as e:
      self.exception = e
    self.finished = True

# TODO this function needs to be migrated to the implementation of the computation interface
def run_remote_command(command):
  command = command.split(' ')
  p = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
  return p.communicate()

# TODO this function needs to be migrated to the implementation of the computation interface
def launch(command):
  results = {
    "ok": True,
    "command": command["command"]
  }

  results["output"], results["errors"] = run_remote_command(command["command"]);

  sys.stdout.write("%s\n" % json.dumps(results))
  sys.stdout.flush()

# TODO this function needs to be migrated to the implementation of the computation interface
def submit_batch(command):
  results = {
    "ok": True,
    "filename": command["command"],
    "output": -1
  }

  results["output"], results["errors"] = run_remote_command("sbatch %s" % results["filename"])

  sys.stdout.write("%s\n" % json.dumps(results))
  sys.stdout.flush()

# TODO this function needs to be migrated to the implementation of the computation interface
def checkjob(command):
  results = {
    "ok": True,
    "jid": command["command"]
  }

  results["output"], results["errors"] = run_remote_command("checkjob %s" % results["jid"])

  sys.stdout.write("%s\n" % json.dumps(results))
  sys.stdout.flush()

# TODO this function needs to be migrated to the implementation of the computation interface
def cancel_job(command):
  results = {
    "ok": True,
    "jid": command["command"]
  }

  results["output"], results["errors"] = run_remote_command("scancel %s" % results["jid"])

  sys.stdout.write("%s\n" % json.dumps(results))
  sys.stdout.flush()

# TODO this function needs to be migrated to the implementation of the computation interface
def get_job_output(command):
  results = {
    "ok": True,
    "jid": command["command"]["jid"]
  }

  path = command["command"]["path"]
  f = path + "slurm-%s.out" % results["jid"]
  if os.path.isfile(f):
    results["output"], results["errors"] = run_remote_command("cat %s" % f)
  else:
    results["output"] = "see errors"
    results["errors"] = "the file %s does not exist." % f

  sys.stdout.write("%s\n" % json.dumps(results))
  sys.stdout.flush()

def get_user_config():
  results = {
    "ok": True
  }
  
  rc = os.path.expanduser('~') + ("/.slycatrc")
  if os.path.isfile(rc):
    try:
      parser = ConfigParser.RawConfigParser()
      parser.read(rc)
      configuration = {section : {key : eval(value) for key, value in parser.items(section)} for section in parser.sections()}
      results["config"] = configuration
      results["errors"] = ""
    except Exception as e:
      results["config"] = {} 
      results["errors"] = "%s" % e
  else:
    results["config"] = "see errors"
    results["errors"] = "the user does not have a .slycatrc file under their home directory"

  sys.stdout.write("%s\n" % json.dumps(results))
  sys.stdout.flush()

def set_user_config(command):
  results = {
    "ok": True,
    "errors": ""
  }
  config = command["command"]["config"]

  rc = os.path.expanduser('~') + ("/.slycatrc")
  rc_file = open(rc, "w+")
  parser = ConfigParser.RawConfigParser()

  for section_key in config:
    if not parser.has_section(section_key):
      parser.add_section(section_key)
    section = config[section_key]
    for option_key in section:
      if not str(section[option_key]) == "":
        parser.set(section_key, option_key, "\"%s\"" % section[option_key])

  parser.write(rc_file)
  rc_file.close()
  sys.stdout.write("%s\n" % json.dumps(results))
  sys.stdout.flush()

# TODO this function needs to be migrated to the implementation of the computation interface
def generate_batch(wckey, nnodes, partition, ntasks_per_node, time_hours, time_minutes, time_seconds, fn, tmp_file):
  f = tmp_file 

  f.write("#!/bin/bash\n\n")
  f.write("#SBATCH --account=%s\n" % wckey)
  f.write("#SBATCH --job-name=slycat-tmp\n")
  f.write("#SBATCH --partition=%s\n\n" % partition)
  f.write("#SBATCH --nodes=%s\n" % nnodes)
  f.write("#SBATCH --ntasks-per-node=%s\n" % ntasks_per_node)
  f.write("#SBATCH --time=%s:%s:%s\n" % (time_hours, time_minutes, time_seconds))
  
  for c in fn:
    f.write("%s\n" % c)

  f.close()

# TODO this function needs to be migrated to the implementation of the computation interface
def run_function(command):
  results = {
    "ok": True,
    "output": -1
  }

  wckey = command["command"]["wckey"]
  nnodes = command["command"]["nnodes"]
  partition = command["command"]["partition"]
  ntasks_per_node = command["command"]["ntasks_per_node"]
  time_hours = command["command"]["time_hours"]
  time_minutes = command["command"]["time_minutes"]
  time_seconds = command["command"]["time_seconds"]
  fn = command["command"]["fn"]
  uid = command["command"]["uid"]

  tmp_file = tempfile.NamedTemporaryFile(delete=False)
  generate_batch(wckey, nnodes, partition, ntasks_per_node, time_hours, time_minutes, time_seconds, fn, tmp_file)
  results["output"], results["errors"] = run_remote_command("sbatch %s" % tmp_file.name)

  sys.stdout.write("%s\n" % json.dumps(results))
  sys.stdout.flush()


# Handle the 'browse' command.
def browse(command):
  if "path" not in command:
    raise Exception("Missing path.")
  path = command["path"]
  if not os.path.isabs(path):
    raise Exception("Path must be absolute.")
  if not os.path.exists(path):
    raise Exception("Path not found.")

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
    "ok": True,
    "path": path,
    "names": [],
    "sizes": [],
    "types": [],
    "mtimes": [],
    "mime-types": [],
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

    if ftype == "d":
      mime_type = "application/x-directory"
    else:
      mime_type = slycat.mime_type.guess_type(name)[0]

    listing["names"].append(name)
    listing["sizes"].append(fstat.st_size)
    listing["types"].append(ftype)
    listing["mtimes"].append(datetime.datetime.fromtimestamp(fstat.st_mtime).isoformat())
    listing["mime-types"].append(mime_type)

  sys.stdout.write("%s\n" % json.dumps(listing))
  sys.stdout.flush()

# Handle the 'get-file' command.
def get_file(command):
  if "path" not in command:
    raise Exception("Missing path.")
  path = command["path"]
  if not os.path.isabs(path):
    raise Exception("Path must be absolute.")
  if not os.access(path, os.R_OK):
    raise Exception("No read permission.")
  if not os.path.exists(path):
    raise Exception("Path not found.")
  if os.path.isdir(path):
    raise Exception("Directory unreadable.")

  try:
    content = open(path, "rb").read()
  except IOError as e:
    if e.errno == errno.EACCES:
      raise Exception("Access denied.")
    raise Exception(e.strerror + ".")
  except Exception as e:
    raise Exception(e.strerror + ".")

  content_type, encoding = slycat.mime_type.guess_type(path)
  sys.stdout.write("%s\n%s" % (json.dumps({"ok": True, "message": "File retrieved.", "path": path, "content-type": content_type, "size": len(content)}), content))
  sys.stdout.flush()

# Handle the 'get-image' command.
def get_image(command):
  if "path" not in command:
    raise Exception("Missing path.")
  path = command["path"]
  if not os.path.isabs(path):
    raise Exception("Path must be absolute.")
  if not os.path.exists(path):
    raise Exception("Path not found.")
  if os.path.isdir(path):
    raise Exception("Directory unreadable.")

  file_content_type, encoding = slycat.mime_type.guess_type(path)
  requested_content_type = command.get("content-type", file_content_type)

  # Optional fast path if the client hasn't requested anything that would alter the image contents:
  if "max-size" not in command and "max-width" not in command and "max-height" not in command and requested_content_type == file_content_type:
    try:
      content = open(path, "rb").read()
    except IOError as e:
      if e.errno == errno.EACCES:
        raise Exception("Access denied.")
      raise Exception(e.strerror + ".")
    except Exception as e:
      raise Exception(e.strerror + ".")

    content_type, encoding = slycat.mime_type.guess_type(path)
    sys.stdout.write("%s\n%s" % (json.dumps({"ok": True, "message": "Image retrieved.", "path": path, "content-type": content_type, "size": len(content)}), content))
    sys.stdout.flush()
    return

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
  sys.stdout.write("%s\n%s" % (json.dumps({"ok": True, "message": "Image retrieved.", "path": path, "content-type": requested_content_type, "size": len(content.getvalue())}), content.getvalue()))
  sys.stdout.flush()

# Handle the 'create-video' command.
def create_video(command, arguments):
  if arguments.ffmpeg is None:
    raise Exception("ffmpeg not configured.")
  if "content-type" not in command:
    raise Exception("Missing content-type.")
  if command["content-type"] not in ["video/mp4", "video/webm"]:
    raise Exception("Unsupported content-type: %s." % command["content-type"])
  if "images" not in command:
    raise Exception("Missing images.")

  sid = uuid.uuid4().hex
  session_cache[sid] = VideoSession(arguments.ffmpeg, command["content-type"], command["images"])
  session_cache[sid].start()

  sys.stdout.write("%s\n" % json.dumps({"ok": True, "message": "Creating video.", "sid": sid}))
  sys.stdout.flush()

def video_status(command, arguments):
  if "sid" not in command:
    raise Exception("Missing session id.")
  if command["sid"] not in session_cache:
    raise Exception("Unknown session id.")
  session = session_cache[command["sid"]]
  if not isinstance(session, VideoSession):
    raise Exception("Not a video session.")
  if session.exception is not None:
    raise Exception("Video creation failed: %s" % session.exception)
  if not session.finished:
    sys.stdout.write("%s\n" % json.dumps({"ok": True, "ready": False, "message": "Not ready."}))
    sys.stdout.flush()
    return
  if session.returncode != 0:
    sys.stdout.write("%s\n" % json.dumps({"ok": False, "message": "Video creation failed.", "returncode": session.returncode, "stderr": session.stderr}))
    sys.stdout.flush()
    return
  sys.stdout.write("%s\n" % json.dumps({"ok": True, "ready": True, "message": "Video ready."}))
  sys.stdout.flush()

def get_video(command, arguments):
  if "sid" not in command:
    raise Exception("Missing session id.")
  if command["sid"] not in session_cache:
    raise Exception("Unknown session id.")
  session = session_cache[command["sid"]]
  if not isinstance(session, VideoSession):
    raise Exception("Not a video session.")
  if session.exception is not None:
    raise Exception("Video creation failed: %s" % session.exception)
  if not session.finished:
    raise Exception("Not ready.")
  if session.returncode != 0:
    raise Exception("Video creation failed.")
  content = open(session.output, "rb").read()
  sys.stdout.write("%s\n%s" % (json.dumps({"ok": True, "message": "Video retrieved.", "content-type": session.content_type, "size": len(content)}), content))
  sys.stdout.flush()

def main():
  # Parse and sanity-check command-line arguments.
  parser = argparse.ArgumentParser()
  parser.add_argument("--fail-startup", default=False, action="store_true", help="Fail immediately on startup.  Obviously, this is for testing.")
  parser.add_argument("--fail-exit", default=False, action="store_true", help="Fail during exit.  Obviously, this is for testing.")
  parser.add_argument("--ffmpeg", default=None, help="Absolute path to an ffmpeg executable.")
  arguments = parser.parse_args()

  if arguments.fail_startup:
    exit(-1)

  try:
    if arguments.ffmpeg is not None:
      if not os.path.isabs(arguments.ffmpeg):
        raise Exception("--ffmpeg must specify an absolute path.")
      if not os.path.exists(arguments.ffmpeg):
        raise Exception("--ffmpeg must specify an existing file.")
  except Exception as e:
    sys.stdout.write("%s\n" % json.dumps({"ok": False, "message":e.message}))
    sys.stdout.flush()
    exit(1)

  # Let the caller know we're ready to handle commands.
  sys.stdout.write("%s\n" % json.dumps({"ok": True, "message": "Ready."}))
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
      if action == "exit":
        if not arguments.fail_exit:
          break
      elif action == "browse":
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
      elif action == "launch":
        launch(command)
      elif action == "submit-batch":
        submit_batch(command)
      elif action == "checkjob":
        checkjob(command)
      elif action == "get-job-output":
        get_job_output(command)
      elif action == "run-function":
        run_function(command)
      elif action == "cancel-job":
        cancel_job(command)
      elif action == "get-user-config":
        get_user_config()
      elif action == "set-user-config":
        set_user_config(command)
      else:
        raise Exception("Unknown command.")
    except Exception as e:
      sys.stdout.write("%s\n" % json.dumps({"ok": False, "message":e.message}))
      sys.stdout.flush()

if __name__ == "__main__":
  main()
