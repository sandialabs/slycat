from __future__ import division

import cStringIO as StringIO
import json
import nose.tools
import os
import PIL.Image, PIL.ImageDraw
import sys
import subprocess
import tempfile
import time

this_dir = os.path.dirname(__file__)
parent_dir = os.path.dirname(os.path.dirname(__file__))
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

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
  nose.tools.assert_equal(json.loads(context.agent.stdout.readline()), {"message": "Not a JSON object."})

@when(u'an unknown command is received')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"foo"}))
  context.agent.stdin.flush()

@then(u'the agent should return an unknown command error')
def step_impl(context):
  nose.tools.assert_equal(json.loads(context.agent.stdout.readline()), {"message": "Unknown command."})

@when(u'a command without an action is received')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({}))
  context.agent.stdin.flush()

@then(u'the agent should return a missing action error')
def step_impl(context):
  nose.tools.assert_equal(json.loads(context.agent.stdout.readline()), {"message": "Missing action."})

@when(u'a browse command without a path is received')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"browse"}))
  context.agent.stdin.flush()

@then(u'the agent should return a missing path error')
def step_impl(context):
  nose.tools.assert_equal(json.loads(context.agent.stdout.readline()), {"message":"Missing path."})

@when(u'browsing a relative path')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"browse", "path":"foo/bar"}))
  context.agent.stdin.flush()

@then(u'the agent should return a relative path error')
def step_impl(context):
  nose.tools.assert_equal(json.loads(context.agent.stdout.readline()), {"message":"Path must be absolute."})

@when(u'browsing a nonexistent path')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"browse", "path":os.path.join(this_dir, "foo.bar")}))
  context.agent.stdin.flush()

@then(u'the agent should return a nonexistent path error')
def step_impl(context):
  nose.tools.assert_equal(json.loads(context.agent.stdout.readline()), {"message":"No such file or directory."})

@when(u'browsing a directory')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"browse", "path":parent_dir}))
  context.agent.stdin.flush()

@then(u'the agent should return the directory information')
def step_impl(context):
  listing = json.loads(context.agent.stdout.readline())
  nose.tools.assert_in("path", listing)
  nose.tools.assert_equal(listing["names"], ["environment.py", "slycat-agent.feature", "steps"])
  nose.tools.assert_in("sizes", listing)
  nose.tools.assert_equal(listing["types"], ["f", "f", "d"])

@when(u'browsing a directory with a file reject rule')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"browse", "file-reject":"[.]py$", "path":os.path.join(root_dir, "packages/slycat")}))
  context.agent.stdin.flush()

@then(u'the agent should return the directory information without the rejected files')
def step_impl(context):
  listing = json.loads(context.agent.stdout.readline())
  nose.tools.assert_not_in("hdf5.py", listing["names"])
  nose.tools.assert_not_in("hyperslice.py", listing["names"])

@when(u'browsing a directory with file reject and allow rules')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"browse", "file-reject":"[.]py$", "file-allow":"hdf5[.]py$", "path":os.path.join(root_dir, "packages/slycat")}))
  context.agent.stdin.flush()

@then(u'the agent should return the directory information without the rejected files, with the allowed files')
def step_impl(context):
  listing = json.loads(context.agent.stdout.readline())
  nose.tools.assert_in("hdf5.py", listing["names"])
  nose.tools.assert_not_in("hyperslice.py", listing["names"])

@when(u'browsing a directory with a directory reject rule')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"browse", "directory-reject":"t[^/]*$", "path":os.path.join(root_dir, "packages/slycat")}))
  context.agent.stdin.flush()

@then(u'the agent should return the directory information without the rejected directories')
def step_impl(context):
  listing = json.loads(context.agent.stdout.readline())
  nose.tools.assert_not_in("table", listing["names"])
  nose.tools.assert_not_in("timeseries", listing["names"])

@when(u'browsing a directory with directory reject and allow rules')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"browse", "directory-reject":"t[^/]*$", "directory-allow":"timeseries$", "path":os.path.join(root_dir, "packages/slycat")}))
  context.agent.stdin.flush()

@then(u'the agent should return the directory information without the rejected directories, with the allowed directories')
def step_impl(context):
  listing = json.loads(context.agent.stdout.readline())
  nose.tools.assert_not_in("table", listing["names"])
  nose.tools.assert_in("timeseries", listing["names"])

@given(u'a sample csv file')
def step_impl(context):
  with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as file:
    context.csv_file_path = file.name
    file.write("""a,b\n1,2\n3,4\n5,6\n""")

@when(u'browsing the csv file')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"browse", "path":context.csv_file_path}))
  context.agent.stdin.flush()

@then(u'the agent should return the file information')
def step_impl(context):
  listing = json.loads(context.agent.stdout.readline())
  nose.tools.assert_in("path", listing)
  nose.tools.assert_true(listing["names"][0].endswith(".csv"))
  nose.tools.assert_equal(listing["sizes"], [16])
  nose.tools.assert_equal(listing["types"], ["f"])

@when(u'retrieving a file without a path')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-file"}))
  context.agent.stdin.flush()

@when(u'retrieving a nonexistent file')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-file", "path":os.path.join(this_dir, "foo.txt")}))
  context.agent.stdin.flush()

@when(u'retrieving the csv file')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-file", "path":context.csv_file_path}))
  context.agent.stdin.flush()

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

@when(u'retrieving an image without a path')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-image"}))
  context.agent.stdin.flush()

@when(u'retrieving a nonexistent image')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-image", "path":os.path.join(this_dir, "foo.jpg")}))
  context.agent.stdin.flush()

@when(u'retrieving an image using an unsupported content type')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-image", "content-type":"image/tiff", "path":context.jpeg_image_path}))
  context.agent.stdin.flush()

@then(u'the agent should return an unsupported content type error')
def step_impl(context):
  nose.tools.assert_equal(json.loads(context.agent.stdout.readline()), {"message":"Unsupported image type."})

@given(u'a sample jpeg image')
def step_impl(context):
  context.jpeg_image_path = os.path.join(root_dir, "artwork/slycat-logo.jpg")

@when(u'retrieving the jpeg image')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-image", "content-type":"image/jpeg", "path":context.jpeg_image_path}))
  context.agent.stdin.flush()

@then(u'the agent should return the jpeg image')
def step_impl(context):
  metadata = json.loads(context.agent.stdout.readline())
  nose.tools.assert_equal(metadata["message"], "Image retrieved.")
  nose.tools.assert_equal(metadata["content-type"], "image/jpeg")
  content = StringIO.StringIO(context.agent.stdout.read(metadata["size"]))
  image = PIL.Image.open(content)
  nose.tools.assert_equal(image.size, (290, 634))

@when(u'retrieving the jpeg image with maximum width')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-image", "max-width":200, "content-type":"image/jpeg", "path":context.jpeg_image_path}))
  context.agent.stdin.flush()

@then(u'the agent should return a jpeg image with maximum width')
def step_impl(context):
  metadata = json.loads(context.agent.stdout.readline())
  nose.tools.assert_equal(metadata["message"], "Image retrieved.")
  nose.tools.assert_equal(metadata["content-type"], "image/jpeg")
  content = StringIO.StringIO(context.agent.stdout.read(metadata["size"]))
  image = PIL.Image.open(content)
  nose.tools.assert_equal(image.size, (200, 437))

@when(u'retrieving the jpeg image with maximum size')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-image", "max-size":500, "content-type":"image/jpeg", "path":context.jpeg_image_path}))
  context.agent.stdin.flush()

@then(u'the agent should return a jpeg image with maximum size')
def step_impl(context):
  metadata = json.loads(context.agent.stdout.readline())
  nose.tools.assert_equal(metadata["message"], "Image retrieved.")
  nose.tools.assert_equal(metadata["content-type"], "image/jpeg")
  content = StringIO.StringIO(context.agent.stdout.read(metadata["size"]))
  image = PIL.Image.open(content)
  nose.tools.assert_equal(image.size, (228, 500))

@when(u'retrieving the jpeg image converted to a png image')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-image", "content-type":"image/png", "path":context.jpeg_image_path}))
  context.agent.stdin.flush()

@then(u'the agent should return the converted png image')
def step_impl(context):
  metadata = json.loads(context.agent.stdout.readline())
  nose.tools.assert_equal(metadata["message"], "Image retrieved.")
  nose.tools.assert_equal(metadata["content-type"], "image/png")
  content = StringIO.StringIO(context.agent.stdout.read(metadata["size"]))
  image = PIL.Image.open(content)
  nose.tools.assert_equal(image.size, (290, 634))

@given(u'a sequence of {type} images')
def step_impl(context, type):
  def generate_image(type, index, count):
    with tempfile.NamedTemporaryFile(suffix="." + type, delete=False) as file:
      percent = index / (count - 1)
      image = PIL.Image.new("RGB", (1024, 512), (int(255 * (1 - percent)), 0, int(255 * percent)))
      image.save(file, type)
      return file.name
  context.image_sequence = [generate_image(type, index, 10) for index in range(10)]

@when(u'creating a {type} video')
def step_impl(context, type):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"create-video", "content-type":"video/" + type, "images":context.image_sequence}))
  context.agent.stdin.flush()

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

    nose.tools.assert_equal(metadata, {"message":"Video ready."})
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
  nose.tools.assert_equal(video_stream["codec_name"], "h264" if type == "mp4" else "vp8")
  nose.tools.assert_equal(video_stream["codec_type"], "video")
  nose.tools.assert_equal(video_stream["width"], 1024)
  nose.tools.assert_equal(video_stream["height"], 512)
  nose.tools.assert_equal(video_stream["nb_read_frames"], "10")

