import cStringIO as StringIO
import json
import nose.tools
import os
import PIL.Image
import subprocess

@given("the slycat agent is running")
def step_impl(context):
  context.agent = subprocess.Popen(["python", "slycat-agent.py"], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
  nose.tools.assert_equal(json.loads(context.agent.stdout.readline()), {"message":"Ready."})

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

@when(u'a get-file command without a path is received')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-file"}))
  context.agent.stdin.flush()

@then(u'the agent should return a missing path error')
def step_impl(context):
  nose.tools.assert_equal(json.loads(context.agent.stdout.readline()), {"message":"Missing path."})

@when(u'a get-file command requests a nonexistent file')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-file", "path":os.path.join(os.path.dirname(__file__), "foo.txt")}))
  context.agent.stdin.flush()

@then(u'the agent should return a nonexistent file error')
def step_impl(context):
  nose.tools.assert_equal(json.loads(context.agent.stdout.readline()), {"message":"No such file or directory."})

@when(u'a get-file command requests a csv file')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-file", "path":os.path.join(os.path.dirname(__file__), "test.csv")}))
  context.agent.stdin.flush()

@then(u'the agent should return the csv file')
def step_impl(context):
  metadata = json.loads(context.agent.stdout.readline())
  nose.tools.assert_equal(metadata["message"], "File retrieved.")
  nose.tools.assert_equal(metadata["content-type"], ["text/csv", None])
  nose.tools.assert_equal(metadata["size"], 16)
  content = context.agent.stdout.read(metadata["size"])
  nose.tools.assert_equal(len(content), metadata["size"])
  print type(content), len(content), content
  reference = "a,b\n1,2\n3,4\n5,6\n"
  print type(reference), len(reference), reference
  nose.tools.assert_equal(content, reference)

@when(u'a get-image command without a path is received')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-image"}))
  context.agent.stdin.flush()

@when(u'a get-image command requests a nonexistent file')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-image", "path":os.path.join(os.path.dirname(__file__), "foo.jpg")}))
  context.agent.stdin.flush()

@when(u'a get-image command requests a jpeg file')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-image", "content-type":"image/jpeg", "path":os.path.normpath(os.path.join(os.path.dirname(__file__), "../../../artwork/slycat-logo.jpg"))}))
  context.agent.stdin.flush()

@then(u'the agent should return the jpeg file')
def step_impl(context):
  metadata = json.loads(context.agent.stdout.readline())
  nose.tools.assert_equal(metadata["message"], "Image retrieved.")
  nose.tools.assert_equal(metadata["content-type"], ["image/jpeg", None])
  content = StringIO.StringIO(context.agent.stdout.read(metadata["size"]))
  image = PIL.Image.open(content)
  nose.tools.assert_equal(image.size, (290, 634))

@when(u'a get-image command requests a jpeg file with resizing')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-image", "max-size":500, "content-type":"image/jpeg", "path":os.path.normpath(os.path.join(os.path.dirname(__file__), "../../../artwork/slycat-logo.jpg"))}))
  context.agent.stdin.flush()

@then(u'the agent should return the resized jpeg file')
def step_impl(context):
  metadata = json.loads(context.agent.stdout.readline())
  nose.tools.assert_equal(metadata["message"], "Image retrieved.")
  nose.tools.assert_equal(metadata["content-type"], ["image/jpeg", None])
  content = StringIO.StringIO(context.agent.stdout.read(metadata["size"]))
  image = PIL.Image.open(content)
  nose.tools.assert_equal(image.size, (228, 500))

@when(u'a get-image command requests a jpeg file with maximum width')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-image", "max-width":200, "content-type":"image/jpeg", "path":os.path.normpath(os.path.join(os.path.dirname(__file__), "../../../artwork/slycat-logo.jpg"))}))
  context.agent.stdin.flush()

@then(u'the agent should return the jpeg file with maximum width')
def step_impl(context):
  metadata = json.loads(context.agent.stdout.readline())
  nose.tools.assert_equal(metadata["message"], "Image retrieved.")
  nose.tools.assert_equal(metadata["content-type"], ["image/jpeg", None])
  content = StringIO.StringIO(context.agent.stdout.read(metadata["size"]))
  image = PIL.Image.open(content)
  nose.tools.assert_equal(image.size, (200, 437))

@when(u'a get-image command requests a jpeg file converted to a png file')
def step_impl(context):
  context.agent.stdin.write("%s\n" % json.dumps({"action":"get-image", "content-type":"image/png", "path":os.path.normpath(os.path.join(os.path.dirname(__file__), "../../../artwork/slycat-logo.jpg"))}))
  context.agent.stdin.flush()

@then(u'the agent should return the converted png file')
def step_impl(context):
  metadata = json.loads(context.agent.stdout.readline())
  nose.tools.assert_equal(metadata["message"], "Image retrieved.")
  nose.tools.assert_equal(metadata["content-type"], ["image/png", None])
  content = StringIO.StringIO(context.agent.stdout.read(metadata["size"]))
  image = PIL.Image.open(content)
  nose.tools.assert_equal(image.size, (290, 634))

