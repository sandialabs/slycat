from behave import *
from parse import *

from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException
from selenium.common.exceptions import TimeoutException

import nose.tools
import tempfile
import sys

def click_continue(driver):
  driver.find_element(By.XPATH, "//button[not(contains(@style,'display: none'))][contains(.,'Continue')]").click()

@given(u'a parameterspace model')
def step_impl(context):
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

@given(u'a sample Parameterspace csv file')
def step_impl(context):
  with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as file:
    context.path = file.name
    file.write("""input,output,neither,categorical,editable\n0,0,0,0,0\n1,1,1,1,1\n0,1,0,1,0\n1,0,1,0,1""")

@when(u'I open the create parameterspace model wizard')
def step_impl(context):
  context.browser.driver.find_element(By.ID, "slycat-create-wizards").click()
  context.browser.find_by_text("a", "New Parameter Space Model").click()
  context.browser.wait_until_visible((By.ID,'slycat-wizard'))

@when(u'I enter model information')
def step_impl(context):
  context.model_name = "Test parameterspace model"
  context.model_description = "Test description for parameterspace model"

  field = context.browser.driver.find_element_by_id("slycat-model-name")
  field.clear()
  field.send_keys(context.model_name)
  field = context.browser.driver.find_element(By.ID, "slycat-model-description")
  field.clear()
  field.send_keys(context.model_description)
  click_continue(context.browser.driver)

@when(u'I select a local file')
def step_impl(context):
  context.browser.find_by_text("label", "Local").click()
  click_continue(context.browser.driver)
  context.browser.driver.find_element(By.ID, "slycat-local-browser-file").send_keys(context.path)
  click_continue(context.browser.driver)
  context.browser.wait_until_visible((By.XPATH, "//slycat-table-ingestion/div"))

@when(u'I select values for the columns')
def step_impl(context):
  for type in ["input", "output", "neither", "categorical", "editable"]:
    context.browser.find_by_text("th", type).click()
    context.browser.driver.find_element(By.XPATH, "//th[contains(.,'" + type.capitalize() + "')]/i").click()
  context.browser.find_by_text("button", "Finish").click()
  context.browser.find_by_text("slycat-model-results", "Created Model")
  context.mid = context.browser.driver.find_element(By.XPATH, "//slycat-model-results//a[contains(.,'here')]").get_attribute("href").split("/").pop()
  context.browser.find_by_text("button", "Go To Model").click()

@then(u'I should be on the model page')
def step_impl(context):
  context.browser.find_by_text("a", context.model_name)
  nose.tools.assert_true(context.browser.driver.current_url.endswith(context.mid))
