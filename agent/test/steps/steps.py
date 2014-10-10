import json
import os
import pexpect

@given("the slycat agent is running")
def step_impl(context):
  context.agent = pexpect.spawn("python slycat-agent.py")
  response = json.loads(context.agent.readline())
  assert response == {"message":"ready"}

@when("an unparsable command is received")
def step_impl(context):
  context.agent.write("foo\n")
  context.agent.readline()

@then("the agent should return an unparsable command error")
def step_impl(context):
  assert json.loads(context.agent.readline()) == {"message": "No JSON object could be decoded"}

@when("an invalid command is received")
def step_impl(context):
  context.agent.write("%s\n" % json.dumps("foo"))
  context.agent.readline()

@then("the agent should return an invalid command error")
def step_impl(context):
  assert json.loads(context.agent.readline()) == {"message": "'unicode' object has no attribute 'get'"}

@when(u'an exit command is received')
def step_impl(context):
  context.agent.write("%s\n" % json.dumps({"action":"exit"}))
  context.agent.readline()

@then(u'the agent should exit')
def step_impl(context):
  assert json.loads(context.agent.readline()) == {"message": "exiting"}
  assert context.agent.readline() == ""
  assert context.agent.eof()

@when(u'a get-image command is received')
def step_impl(context):
  context.agent.write("%s\n" % json.dumps({"action":"get-image"}))
  context.agent.readline()

@then(u'the agent should return the image')
def step_impl(context):
  raise NotImplementedError()

