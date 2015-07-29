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

from pyvirtualdisplay import Display

from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities 
from selenium.webdriver.common.action_chains import ActionChains as AC

d = DesiredCapabilities.FIREFOX
d['loggingPrefs'] = { 'browser':'ALL' }

display = Display(visible=True, size=(800,600))
display.start()

driver = webdriver.Firefox(capabilities=d)
wait = WebDriverWait(driver, 10)
actions = AC(driver)

@given(u'the slycat servers are running')
def step_impl(context):
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

def wait_until_visible(element_tuple):
  wait.until(EC.visibility_of_element_located(element_tuple))
  return driver.find_element(element_tuple[0], element_tuple[1])

def find_by_text(tag, text):
  return wait_until_visible((By.XPATH,"//" + tag + "[contains(.,'" + text + "')]"))

def print_log():
  for entry in driver.get_log('browser'):
    print(entry)

counter = 0
def s():
  global counter
  driver.save_screenshot("/home/slycat/src/slycat/" + str(counter) + ".png")
  counter += 1

@given(u'I am on the front page')
def step_impl(context):
  driver.set_window_size(1024,800)
  driver.get("https://slycat:slycat@localhost:8443")
  driver.find_element_by_id("slycat-projects")

@given(u'I have a project')
def step_impl(context):
  context.execute_steps(u'''
    given I am on the front page
  ''')
  try:
    wait_until_visible((By.CSS_SELECTOR, "//strong[contains(.,project)]"))
  except:
    context.execute_steps(u'''when I create a project''')
    return

@when(u'I open the first project')
def step_impl(context):
  driver.find_element(By.CSS_SELECTOR, "//a[contains(@class,'list-group-item')] > strong[contains(.,project)]").click()

@when(u'I create a project')
def step_impl(context):
  context.execute_steps(u'''
    when I open the new project wizard
    and I enter a project name and description
    and I click Finish
  ''')

@when(u'I open the new project wizard')
def step_impl(context):
  wait_until_visible((By.ID, 'slycat-create-wizards')).click()
  find_by_text("a", "New Project").click()

@when(u'I enter a project name and description')
def step_impl(context):
  wizard = wait_until_visible((By.ID,'slycat-wizard'))
  driver.find_element_by_id("slycat-create-project-name").send_keys("Test Project")
  driver.find_element_by_id("slycat-create-project-description").send_keys('This is a project create for a behave test')
  context.project_name = "Test Project"

@when(u'I click Finish')
def step_impl(context):
  find_by_text("li", "Finish").click()
  wait_until_visible((By.ID, "slycat-project"))

@when(u'I open the project page')
def step_impl(context):
  return

@then(u'I should be on the new project page')
def step_impl(context):
  nose.tools.assert_true(re.compile("https://.*/projects/[^/]*$").match(driver.current_url))
