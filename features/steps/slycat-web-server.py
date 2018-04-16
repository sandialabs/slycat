# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

from __future__ import division
from behave import *
from parse import *

try:
  import cStringIO as StringIO
except:
  import StringIO

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
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from selenium.webdriver.common.action_chains import ActionChains

class Driver():
  d = DesiredCapabilities.FIREFOX
  d['marionette'] = True
  d['loggingPrefs'] = { 'browser':'ALL' }

  display = Display(size=(800,600))
  display.start()

  driver = webdriver.Firefox(capabilities=d)
  wait = WebDriverWait(driver, 10)
  action = ActionChains(driver)

  def wait_until_visible(self, element_tuple):
    self.wait.until(EC.visibility_of_element_located(element_tuple))
    return self.driver.find_element(element_tuple[0], element_tuple[1])

  def wait_until_hidden(self, element_tuple):
    self.wait.until(EC.invisibility_of_element_located(element_tuple))

  def find_by_text(self, tag, text):
    return self.wait_until_visible((By.XPATH,"//" + tag + "[contains(.,'" + text + "')]"))

  def print_log(self):
    for entry in driver.get_log('browser'):
      print(entry)

@given(u'a browser is open')
def step_impl(context):
  context.browser = Driver()

@given(u'I am on the front page')
def step_impl(context):
  context.browser.driver.set_window_size(800,600)
  context.browser.driver.get("https://slycat:slycat@localhost/projects")
  context.browser.wait_until_visible((By.ID, "slycat-navbar-content"))

@given(u'a project')
def step_impl(context):
  context.execute_steps(u'''
    given I am on the front page
  ''')
  try:
    context.browser.wait_until_visible((By.XPATH, "//span[contains(.,'project')]"))
  except:
    context.execute_steps(u'''when I create a project''')
    return

@given(u'the first project is open')
@when(u'I open the first project')
def step_impl(context):
  context.browser.driver.find_element(By.CLASS_NAME, "list-group-item").click()
  context.pid = context.browser.driver.current_url.split("/").pop()

@when(u'I create a project')
def step_impl(context):
  context.execute_steps(u'''
    when I open the new project wizard
    and I enter a project name and description
    and I click Finish
    given I am on the front page
  ''')

@when(u'I open the new project wizard')
def step_impl(context):
  context.browser.wait_until_visible((By.ID, 'slycat-create-wizards')).click()
  context.browser.find_by_text("a", "New Project").click()
  context.browser.wait_until_visible((By.ID,'slycat-wizard'))

@when(u'I open the edit project wizard')
def step_impl(context):
  context.browser.wait_until_visible((By.ID, 'slycat-edit-wizards')).click()
  context.browser.find_by_text("a", "Edit Project").click()
  context.browser.wait_until_visible((By.ID,'slycat-wizard'))

@when(u'I open the project info form')
def step_impl(context):
  context.browser.wait_until_visible((By.ID, 'slycat-info-wizards')).click()
  context.browser.find_by_text("a", "Project Details").click()
  context.browser.wait_until_visible((By.ID,'slycat-wizard'))

@when(u'I choose Delete Project')
def step_impl(context):
  context.pid = context.browser.driver.current_url.split("/").pop()
  context.browser.wait_until_visible((By.ID, 'slycat-delete-wizards')).click()
  context.browser.find_by_text("a", "Delete Project").click()

@when(u'I enter a project name and description')
def step_impl(context):
  context.project_name = "Test Project"
  context.project_description = "This is a project created for a behave test"
  context.browser.driver.find_element_by_id("slycat-create-project-name").send_keys(context.project_name)
  context.browser.driver.find_element_by_id("slycat-create-project-description").send_keys(context.project_description)

@when(u'I enter new values in the edit form')
def step_impl(context):
  context.project_name = "Edited Test Project"
  context.project_description = "This project has been edited by a behave test"
  project_name_field = context.browser.driver.find_element_by_id("slycat-edit-project-name")
  project_description_field = context.browser.driver.find_element_by_id("slycat-edit-project-description")
  project_name_field.clear()
  project_name_field.send_keys(context.project_name)
  project_description_field.clear()
  project_description_field.send_keys(context.project_description)

@when(u'I click Finish')
def step_impl(context):
  context.browser.find_by_text("li", "Finish").click()
  context.browser.wait_until_visible((By.ID, "slycat-project"))

@when(u'I press Enter in the project name')
def step_impl(context):
  context.browser.driver.find_element_by_id("slycat-create-project-name").send_keys(Keys.ENTER)
  context.browser.wait_until_visible((By.ID, "slycat-project"))

@when(u'I click Save Changes')
def step_impl(context):
  context.browser.find_by_text("button", "Save Changes").click()

@when(u'I confirm by clicking Delete Project')
def step_impl(context):
  context.browser.find_by_text("button", "Delete Project").click()

@when(u'I open the project page')
def step_impl(context):
  return

@then(u'I should be on the project page')
def step_impl(context):
  nose.tools.assert_true(re.compile("https://.*/projects/[^/]*$").match(context.browser.driver.current_url))
  context.browser.find_by_text("a", context.project_name)

@then(u'I should see my values on the project')
def step_impl(context):
  context.execute_steps(u'''when I open the project info form''')
  selector = "//p[contains(.,'" + context.project_description + "')]"
  context.browser.driver.find_element(By.XPATH, selector)

@then(u'I should not see a project on the front page')
def step_impl(context):
  context.execute_steps(u'''given I am on the front page''')
  with nose.tools.assert_raises(NoSuchElementException):
    context.browser.driver.find_element(By.XPATH, "//a[contains(@href,'" + context.pid + "')]")
