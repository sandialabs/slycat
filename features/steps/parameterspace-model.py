# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

from behave import *
from parse import *

from selenium.common.exceptions import NoSuchElementException
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains

import nose.tools
import sys
import time
import subprocess

class ParameterspaceDriver():
  driver = None
  def __init__(self, context):
    global driver
    driver = context.browser.driver

  def calculate_point(self, index):
    code_base = "$('#scatterplot').data()['parameter_image-scatterplot']"
    index = driver.execute_script("return %s.options.filtered_indices[%d]" % (code_base, index))
    x_scaled = driver.execute_script("return %s.x_scale_canvas(%s.options.x[%d])" % (code_base, code_base, index))
    y_scaled = driver.execute_script("return %s.y_scale_canvas(%s.options.y[%d])" % (code_base, code_base, index))

    #Selenium calculates coordinates from the top left
    # We calculate coordinates from the bottom left
    return (x_scaled, y_scaled)

@given(u'a parameterspace model')
def step_impl(context):
  context.model_driver = context.model_driver or ParameterspaceDriver(context)
  try:
    context.browser.find_by_text("a", "parameter-image model")
    context.execute_steps(u'''
      when I open the first parameterspace model
    ''')
  except (NoSuchElementException, TimeoutException):
    context.execute_steps(u'''
      when I open the create parameterspace model wizard
      and I enter model information
      and I select a local file
      and I select values for the columns
    ''')

@given(u'a sample Parameterspace csv file with images')
def step_impl(context):
  context.model_driver = ParameterspaceDriver(context)
  subprocess.call(["web-client/slycat-create-sample-parameter-image-csv.py"])
  context.path = "/home/slycat/src/slycat/web-client/sample-parameter-images.csv"
  context.model_columns = {}
  columns = ["category", "rating", "input", "output", "unused"]
  types = ["Categorical", "Editable", "Input", "Output", "Neither"]
  def update(x):
    context.model_columns[x[0] + "0"] = x[1]
    context.model_columns[x[0] + "1"] = x[1]
  map(update, zip(columns, types))


@when(u'I open the first parameterspace model')
def step_impl(context):
  context.browser.find_by_text("a", "parameter-image model").click()

@when(u'the colormap is changed to {}')
def step_impl(context, color):
  context.browser.wait_until_visible((By.ID, "colors-dropdown")).click()
  context.browser.find_by_text("a", color).click()

@given(u'a displayed image')
def step_impl(context):
  context.execute_steps(u'''
    When a point is moused over
  ''')
  try:
    context.execute_steps(u'''
      When a valid user logs in
    ''')
  except:
    return

@when(u'credentials are entered')
def step_impl(context):
  context.browser.driver.find_element_by_id("slycat-login-username").send_keys("slycat")
  context.browser.driver.find_element_by_id("slycat-login-password").send_keys("slycat")

@when(u'a valid user logs in')
def step_impl(context):
  context.execute_steps(u'''
    When credentials are entered
    And the Login button is clicked
  ''')

@when(u'a point is moused over')
def step_impl(context):
  context.browser.wait_until_hidden((By.XPATH, "//div[contains(@class,'slycat-navbar-alert')]/p[contains(.,'waiting')]"))
  canvas = context.browser.wait_until_visible((By.CSS_SELECTOR, "canvas"))
  point = context.model_driver.calculate_point(0)
  context.browser.action.move_to_element_with_offset(canvas, point[0], point[1]).perform()
  time.sleep(2)

@when(u'the {} button is clicked')
def step_impl(context, button_text):
  context.browser.find_by_text("button", button_text).click()
