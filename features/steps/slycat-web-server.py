from __future__ import division
from behave import *
from parse import *

import cStringIO as StringIO
import nose.tools
import operator
import os
import PIL.Image, PIL.ImageDraw
import sys
import subprocess
import tempfile
import time
import re

try:
  from ghost import Ghost
  ghost = Ghost()
except:
  pass

root_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

@given(u'the slycat servers are running')
def step_impl(context):
  print("Running servers")
  subprocess.call(['kill', '%(ps aux | grep supervisord | grep -v grep | awk \'{ print $2 }\')'])
  supervisord = subprocess.Popen(["supervisord", "-c", "/etc/supervisord.conf"], stdout=subprocess.PIPE)
  values = {'success': ['sshd', 'couchdb', 'web-server', 'proxy-server', 'feed-server'], 'exited': ['couchdb-setup']}
  expected = {}
  for key in values:
    for value in values[key]:
      expected[re.compile(" ".join(["INFO", key + ":", value]))] = False
  x = 0
  while (not reduce(operator.and_, expected.values())) and x < 100:
    x += 1
    next_line = supervisord.stdout.readline()
    for key in expected:
      if key.search(next_line):
        expected[key] = True

@given(u'I am on the front page')
def step_impl(context):
  print("Running servers")
  ghost.open("https://localhost", auth=["slycat", "slycat"])
  ghost.wait_for_selector("#slycat-projects")
  ghost.capture_to("/home/slycat/src/slycat/01.png")

@when(u'I open the new project wizard')
def step_impl(context):
  ghost.evaluate("$(.collapsed[data-target=#slycat-navbar-content]).click()")
  ghost.wait_for_selector("#slycat-create-button")
  ghost.capture_to("/home/slycat/src/slycat/02.png")
  ghost.evaluate("$('#slycat-create-button').click()")
  ghost.capture_to("/home/slycat/src/slycat/04.png")

@when(u'I enter a project name and description')
def step_impl(context):
  ghost.evaluate("$('#slycat-create-project-name').text('Test Project')")
  ghost.evaluate("$('#slycat-create-project-description').text('This is a project create for a behave test')")
  ghost.capture_to("/home/slycat/src/slycat/05.png")

@when(u'I click Finish')
def step_impl(context):
  ghost.evaluate("$($(#slycat-wizard .modal-footer .btn.btn-default)[0]).click()")
  ghost.wait_for_selector("#slycat-project")
  ghost.capture_to("/home/slycat/src/slycat/05.png")

@when(u'I open the project page')
def step_impl(context):
  ghost.open("https://localhost", auth=["slycat", "slycat"])
  ghost.wait_for_selector("#slycat-projects")
  ghost.capture_to("/home/slycat/src/slycat/06.png")

@then(u'I should be on the new project page')
def step_impl(context):
  return
