# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

from __future__ import division

try:
  import cStringIO as StringIO
except:
  import StringIO

import json
import nose.tools
import os
import PIL.Image, PIL.ImageDraw
import sys
import subprocess
import tempfile
import time

root_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
data_dir = os.path.join(root_dir, "features/data/agent")
slycat_agent = os.path.join(root_dir, "agent", "slycat-docker-agent.py")

@given(u'a running Slycat agent')
def step_impl(context):
  context.agent = subprocess.Popen([sys.executable, slycat_agent], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
  nose.tools.assert_equal(json.loads(context.agent.stdout.readline()), {"ok": True, "message": "Ready."})

@when("an unparsable command is received")
def step_impl(context):
  context.agent.stdin.write("foo\n")
  context.agent.stdin.flush()

@when("a parsable but invalid command is received")
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps("foo"))
  context.agent.stdin.flush()

@then("the agent should return an invalid command error")
def step_impl(context):
  nose.tools.assert_equal(json.loads(context.agent.stdout.readline()), {"ok": False, "message": "Not a JSON object."})

@when(u'an unknown command is received')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"foo"}))
  context.agent.stdin.flush()

@then(u'the agent should return an unknown command error')
def step_impl(context):
  nose.tools.assert_equal(json.loads(context.agent.stdout.readline()), {"ok": False, "message": "Unknown command."})

@when(u'a command without an action is received')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({}))
  context.agent.stdin.flush()

@then(u'the agent should return a missing action error')
def step_impl(context):
  nose.tools.assert_equal(json.loads(context.agent.stdout.readline()), {"ok": False, "message": "Missing action."})

@when(u'a browse command without a path is received')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"browse"}))
  context.agent.stdin.flush()

@then(u'the agent should return a missing path error')
def step_impl(context):
  nose.tools.assert_equal(json.loads(context.agent.stdout.readline()), {"ok": False, "message": "Missing path."})

@when(u'browsing a relative path')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"browse", "path":"foo/bar"}))
  context.agent.stdin.flush()

@then(u'the agent should return a relative path error')
def step_impl(context):
  nose.tools.assert_equal(json.loads(context.agent.stdout.readline()), {"ok": False, "message": "Path must be absolute."})

@when(u'browsing a nonexistent path')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"browse", "path":os.path.join(data_dir, "nonexistent-dir")}))
  context.agent.stdin.flush()

@then(u'the agent should return a path not found error')
def step_impl(context):
  message = json.loads(context.agent.stdout.readline())
  nose.tools.assert_equal(message["message"], u"Path not found.")
  nose.tools.assert_equal(message["ok"], False)
@when(u'browsing a directory')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"browse", "path":data_dir}))
  context.agent.stdin.flush()

@then(u'the agent should return the directory information')
def step_impl(context):
  listing = json.loads(context.agent.stdout.readline())
  nose.tools.assert_in("path", listing)
  nose.tools.assert_equal(listing["names"], ["slycat-logo-navbar.jpg", "slycat-logo-navbar.png", "slycat-logo.png", "subdir"])
  nose.tools.assert_in("sizes", listing)
  nose.tools.assert_equal(listing["types"], ["f", "f", "f", "d"])

@when(u'browsing a directory with a file reject rule')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"browse", "file-reject":"[.]png$", "path":data_dir}))
  context.agent.stdin.flush()

@then(u'the agent should return the directory information without the rejected files')
def step_impl(context):
  listing = json.loads(context.agent.stdout.readline())
  nose.tools.assert_in("slycat-logo-navbar.jpg", listing["names"])
  nose.tools.assert_not_in("slycat-logo-navbar.png", listing["names"])
  nose.tools.assert_not_in("slycat-logo.png", listing["names"])

@when(u'browsing a directory with file reject and allow rules')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"browse", "file-reject":"[.]png$", "file-allow":"slycat-logo[.]png$", "path":data_dir}))
  context.agent.stdin.flush()

@then(u'the agent should return the directory information without the rejected files, with the allowed files')
def step_impl(context):
  listing = json.loads(context.agent.stdout.readline())
  nose.tools.assert_in("slycat-logo-navbar.jpg", listing["names"])
  nose.tools.assert_not_in("slycat-logo-navbar.png", listing["names"])
  nose.tools.assert_in("slycat-logo.png", listing["names"])

@when(u'browsing a directory with a directory reject rule')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"browse", "directory-reject":"w[^/]*$", "path":os.path.join(root_dir, "packages/slycat")}))
  context.agent.stdin.flush()

@then(u'the agent should return the directory information without the rejected directories')
def step_impl(context):
  listing = json.loads(context.agent.stdout.readline())
  nose.tools.assert_not_in("web", listing["names"])

@when(u'browsing a directory with directory reject and allow rules')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"browse", "directory-reject":"[hw][^/]*$", "directory-allow":"web$", "path":os.path.join(root_dir, "packages/slycat")}))
  context.agent.stdin.flush()

@then(u'the agent should return the directory information without the rejected directories, with the allowed directories')
def step_impl(context):
  listing = json.loads(context.agent.stdout.readline())
  nose.tools.assert_not_in("hyperchunks", listing["names"])
  nose.tools.assert_in("web", listing["names"])

@given(u'a sample csv file')
def step_impl(context):
  with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as file:
    context.path = file.name
    file.write("""a,b\n1,2\n3,4\n5,6\n""")

@when(u'browsing the csv file')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"browse", "path":context.path}))
  context.agent.stdin.flush()

@then(u'the agent should return the file information')
def step_impl(context):
  listing = json.loads(context.agent.stdout.readline())
  nose.tools.assert_in("path", listing)
  nose.tools.assert_true(listing["names"][0].endswith(".csv"))
  nose.tools.assert_equal(listing["sizes"], [16])
  nose.tools.assert_equal(listing["types"], ["f"])

#########################################################################################
# File retrieval

@when(u'retrieving a file without a path')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-file"}))
  context.agent.stdin.flush()

@given(u'a relative path')
def step_impl(context):
  context.path = "foo.txt"

@given(u'a directory path')
def step_impl(context):
  context.path = root_dir

@then(u'the agent should return a directory unreadable error')
def step_impl(context):
  nose.tools.assert_equal(json.loads(context.agent.stdout.readline()), {"ok": False, "message": "Directory unreadable."})

@given(u'a nonexistent file')
def step_impl(context):
  context.path = os.path.join(data_dir, "nonexistent.txt")

@given(u'the file has no permissions')
def step_impl(context):
  os.chmod(context.path, 0x000)

@when(u'retrieving a file')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-file", "path":context.path}))
  context.agent.stdin.flush()

@then(u'the agent should return an access denied error')
def step_impl(context):
  nose.tools.assert_equal(json.loads(context.agent.stdout.readline()), {"ok": False, "message": "Access denied."})

@then(u'the agent should return a no read permission error')
def step_impl(context):
  nose.tools.assert_equal(json.loads(context.agent.stdout.readline()), {"ok": False, "message": "No read permission."})

@then(u'the agent should return the csv file')
def step_impl(context):
  metadata = json.loads(context.agent.stdout.readline())
  nose.tools.assert_equal(metadata["message"], "File retrieved.")
  nose.tools.assert_equal(metadata["content-type"], "text/csv")
  nose.tools.assert_equal(metadata["size"], 16)
  content = context.agent.stdout.read(metadata["size"])
  nose.tools.assert_equal(len(content), metadata["size"])
  reference = "a,b\n1,2\n3,4\n5,6\n"
  nose.tools.assert_equal(content, reference)

###########################################################################################
# Image retrieval

@given(u'a sample jpeg image')
def step_impl(context):
  with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as file:
    context.path = file.name
    file.write(open(os.path.join(data_dir, "slycat-logo-navbar.jpg"), "rb").read())

@given(u'a nonexistent image')
def step_impl(context):
  context.path = os.path.join(data_dir, "nonexistent.jpg")

@when(u'retrieving an image without a path')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-image"}))
  context.agent.stdin.flush()

@when(u'retrieving an image')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-image", "path":context.path}))
  context.agent.stdin.flush()

@when(u'retrieving an image with an unsupported content type')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-image", "content-type":"image/tiff", "path":context.path}))
  context.agent.stdin.flush()

@then(u'the agent should return an unsupported content type error')
def step_impl(context):
  nose.tools.assert_equal(json.loads(context.agent.stdout.readline()), {"ok": False, "message": "Unsupported image type."})

@when(u'retrieving an image with maximum width')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-image", "max-width":200, "content-type":"image/jpeg", "path":context.path}))
  context.agent.stdin.flush()

@when(u'retrieving an image with maximum size')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-image", "max-size":500, "content-type":"image/jpeg", "path":context.path}))
  context.agent.stdin.flush()

@when(u'retrieving an image converted to a png image')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-image", "content-type":"image/png", "path":context.path}))
  context.agent.stdin.flush()

@then(u'the agent should return the jpeg image')
def step_impl(context):
  metadata = json.loads(context.agent.stdout.readline())
  nose.tools.assert_equal(metadata["message"], "Image retrieved.")
  nose.tools.assert_equal(metadata["content-type"], "image/jpeg")
  content = StringIO.StringIO(context.agent.stdout.read(metadata["size"]))
  image = PIL.Image.open(content)
  nose.tools.assert_equal(image.size, (1324, 292))

@then(u'the agent should return a jpeg image with maximum width')
def step_impl(context):
  metadata = json.loads(context.agent.stdout.readline())
  nose.tools.assert_equal(metadata["message"], "Image retrieved.")
  nose.tools.assert_equal(metadata["content-type"], "image/jpeg")
  content = StringIO.StringIO(context.agent.stdout.read(metadata["size"]))
  image = PIL.Image.open(content)
  nose.tools.assert_equal(image.size, (200, 44))

@then(u'the agent should return a jpeg image with maximum size')
def step_impl(context):
  metadata = json.loads(context.agent.stdout.readline())
  nose.tools.assert_equal(metadata["message"], "Image retrieved.")
  nose.tools.assert_equal(metadata["content-type"], "image/jpeg")
  content = StringIO.StringIO(context.agent.stdout.read(metadata["size"]))
  image = PIL.Image.open(content)
  nose.tools.assert_equal(image.size, (500, 110))

@then(u'the agent should return the converted png image')
def step_impl(context):
  metadata = json.loads(context.agent.stdout.readline())
  nose.tools.assert_equal(metadata["message"], "Image retrieved.")
  nose.tools.assert_equal(metadata["content-type"], "image/png")
  content = StringIO.StringIO(context.agent.stdout.read(metadata["size"]))
  image = PIL.Image.open(content)
  nose.tools.assert_equal(image.size, (1324, 292))

####################################################################################################
# Video creation

@given(u'a sequence of {type} images')
def step_impl(context, type):
  def generate_image(type, index, count):
    with tempfile.NamedTemporaryFile(suffix="." + type, delete=False) as file:
      percent = index / (count - 1)
      image = PIL.Image.new("RGB", (1024, 512), (int(255 * (1 - percent)), 0, int(255 * percent)))
      image.save(file, type)
      return file.name
  context.image_sequence = [generate_image(type, index, 10) for index in range(10)]

# @when(u'creating a {type} video')
# def step_impl(context, type):
#   context.agent.stdin.write("%s\n" % json.dumps({"action":"create-video", "content-type":"video/" + type, "images":context.image_sequence}))
#   context.agent.stdin.flush()

@then(u'the agent should return a video session id')
def step_impl(context):
  metadata = json.loads(context.agent.stdout.readline())
  nose.tools.assert_equal(metadata["message"], "Creating video.")
  nose.tools.assert_in("sid", metadata)
  context.sid = metadata["sid"]

@then(u'the agent should return a {type} video')
def step_impl(context, type):
  nose.tools.assert_in(type, ["mp4", "webm"])

  while True:
    context.agent.stdin.write("%s\n" % json.dumps({"action":"video-status", "sid":context.sid}))
    context.agent.stdin.flush()

    metadata = json.loads(context.agent.stdout.readline())
    if metadata["message"] == "Not ready.":
      time.sleep(0.1)
      continue
    print(metadata["message"])
    print(metadata["ok"])
    nose.tools.assert_equal(metadata, {"ready": True, "ok": True, "message":"Video ready."})
    break

  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-video", "sid":context.sid}))
  context.agent.stdin.flush()

  metadata = json.loads(context.agent.stdout.readline())
  nose.tools.assert_equal(metadata["message"], "Video retrieved.")
  nose.tools.assert_equal(metadata["content-type"], "video/" + type)
  content = StringIO.StringIO(context.agent.stdout.read(metadata["size"]))

  ffprobe = subprocess.Popen(["ffprobe", "-print_format", "json", "-show_format", "-show_streams", "-count_frames", "-"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
  stdout, stderr = ffprobe.communicate(content.getvalue())
  sys.stderr.write(stdout)
  sys.stderr.flush()
  video_metadata = json.loads(stdout)
  video_format = video_metadata["format"]
  nose.tools.assert_equal(video_format["nb_streams"], 1)
  nose.tools.assert_in("mp4" if type == "mp4" else "webm", video_format["format_name"])
  video_stream = video_metadata["streams"][0]
  nose.tools.assert_equal(video_stream["codec_name"], "h264" if type == "mp4" else "vp9")
  nose.tools.assert_equal(video_stream["codec_type"], "video")
  nose.tools.assert_equal(video_stream["width"], 1024)
  nose.tools.assert_equal(video_stream["height"], 512)
  nose.tools.assert_equal(video_stream["nb_read_frames"], "10")

