import json
import nose.tools
import os
import pexpect

@given("the slycat agent is running")
def step_impl(context):
  context.agent = pexpect.spawn("python slycat-agent.py")
  nose.tools.assert_equal(json.loads(context.agent.readline()), {"message":"Ready."})

@when("an unparsable command is received")
def step_impl(context):
  context.agent.write("foo\n")
  context.agent.readline()

@then("the agent should return an unparsable command error")
def step_impl(context):
  nose.tools.assert_equal(json.loads(context.agent.readline()), {"message": "Not a JSON object."})

@when("an invalid command is received")
def step_impl(context):
  context.agent.write("%s\n" % json.dumps("foo"))
  context.agent.readline()

@then("the agent should return an invalid command error")
def step_impl(context):
  nose.tools.assert_equal(json.loads(context.agent.readline()), {"message": "Not a dict."})

@when(u'an exit command is received')
def step_impl(context):
  context.agent.write("%s\n" % json.dumps({"action":"exit"}))
  context.agent.readline()

@then(u'the agent should exit')
def step_impl(context):
  nose.tools.assert_equal(json.loads(context.agent.readline()), {"message": "Exiting."})
  nose.tools.assert_equal(context.agent.readline(), "")
  nose.tools.assert_true(context.agent.eof())

@when(u'a get-image command without a path is received')
def step_impl(context):
  context.agent.write("%s\n" % json.dumps({"action":"get-image"}))
  context.agent.readline()

@then(u'the agent should return a missing path error')
def step_impl(context):
  nose.tools.assert_equal(json.loads(context.agent.readline()), {"message":"Missing path."})

@when(u'a get-image command is received')
def step_impl(context):
  context.agent.write("%s\n" % json.dumps({"action":"get-image", "path":os.path.normpath(os.path.join(os.path.dirname(__file__), "../../../artwork/slycat-logo.jpg"))}))
  context.agent.readline()

@then(u'the agent should return the image')
def step_impl(context):
  metadata = json.loads(context.agent.readline())
  nose.tools.assert_equal(metadata["message"], "Image retrieved.")
  nose.tools.assert_equal(metadata["size"], 38845)
  image = context.agent.read(metadata["size"])
