import json
import nose
import subprocess

def before_feature(context, scenario):
  context.agent = subprocess.Popen(["python", "slycat-agent.py"], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
  nose.tools.assert_equal(json.loads(context.agent.stdout.readline()), {"message":"Ready."})
