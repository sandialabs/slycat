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

class Driver():
  d = DesiredCapabilities.FIREFOX
  d['loggingPrefs'] = { 'browser':'ALL' }

  display = Display(visible=True,size=(800,600))
  display.start()

  driver = webdriver.Firefox(capabilities=d)
  wait = WebDriverWait(driver, 10)

  def wait_until_visible(self, element_tuple):
    self.wait.until(EC.visibility_of_element_located(element_tuple))
    return self.driver.find_element(element_tuple[0], element_tuple[1])

  def find_by_text(self, tag, text):
    return self.wait_until_visible((By.XPATH,"//" + tag + "[contains(.,'" + text + "')]"))

  def print_log(self):
    for entry in driver.get_log('browser'):
      print(entry)

@given(u'the slycat servers are running')
def step_impl(context):
#  supervisord = subprocess.Popen(["supervisord", "-c", "/etc/supervisord.conf"], stdout=subprocess.PIPE)
#  values = {'success': ['sshd', 'couchdb', 'web-server', 'proxy-server', 'feed-server'], 'exited': ['couchdb-setup']}
#  expected = {}
#  for key in values:
#    for value in values[key]:
#      expected[re.compile(" ".join(["INFO", key + ":", value]))] = False
#  x = 0
#  while (not reduce(operator.and_, expected.values())) and x < 100:
#    x += 1
#    next_line = supervisord.stdout.readline()
#    for key in expected:
#      if key.search(next_line):
#        expected[key] = True
  context.browser = Driver()


counter = 0
def s(context):
  global counter
  context.browser.driver.save_screenshot("/home/slycat/src/slycat/" + str(counter) + ".png")
  counter += 1

@given(u'I am on the front page')
def step_impl(context):
  webdriver.Firefox().set_window_size

  context.browser.driver.set_window_size(800,600)
  context.browser.driver.get("https://slycat:slycat@localhost:8443/projects")
  context.browser.driver.find_element(By.ID, "slycat-navbar-content")

@given(u'I have a project')
def step_impl(context):
  context.execute_steps(u'''
    given I am on the front page
  ''')
  try:
    context.browser.wait_until_visible((By.CSS_SELECTOR, "//strong[contains(.,project)]"))
  except:
    context.execute_steps(u'''when I create a project''')
    return

@when(u'I open the first project')
def step_impl(context):
  context.browser.driver.find_element(By.CSS_SELECTOR, "//a[contains(@class,'list-group-item')] > strong[contains(.,project)]").click()

@when(u'I create a project')
def step_impl(context):
  context.execute_steps(u'''
    when I open the new project wizard
    and I enter a project name and description
    and I click Finish
  ''')

@when(u'I open the new project wizard')
def step_impl(context):
  context.browser.wait_until_visible((By.ID, 'slycat-create-wizards')).click()
  context.browser.find_by_text("a", "New Project").click()

@when(u'I enter a project name and description')
def step_impl(context):
  wizard = context.browser.wait_until_visible((By.ID,'slycat-wizard'))
  context.browser.driver.find_element_by_id("slycat-create-project-name").send_keys("Test Project")
  context.browser.driver.find_element_by_id("slycat-create-project-description").send_keys('This is a project create for a behave test')
  context.project_name = "Test Project"

@when(u'I click Finish')
def step_impl(context):
  context.browser.find_by_text("li", "Finish").click()
  context.browser.wait_until_visible((By.ID, "slycat-project"))

@when(u'I open the project page')
def step_impl(context):
  return

@then(u'I should be on the new project page')
def step_impl(context):
  nose.tools.assert_true(re.compile("https://.*/projects/[^/]*$").match(context.browser.driver.current_url))
  context.browser.find_by_text("a", context.project_name)
