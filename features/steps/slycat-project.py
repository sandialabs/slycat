# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

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

@given(u'a sample Parameterspace csv file')
def step_impl(context):
  with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as file:
    context.path = file.name
    file.write("""input,output,neither,categorical,editable\n0,0,0,0,0\n1,1,1,1,1\n0,1,0,1,0\n1,0,1,0,1""")
  context.model_columns = {"input": "Input", "output": "Output", "neither": "Neither", "categorical": "Categorical", "editable": "Editable"}

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
  for (column_name, input_type) in context.model_columns.iteritems():
    context.browser.find_by_text("th", column_name).click()
    context.browser.driver.find_element(By.XPATH, "//th[contains(.,'" + input_type + "')]/i").click()
  context.browser.find_by_text("button", "Finish").click()
  context.browser.find_by_text("slycat-model-results", "Created Model")
  context.mid = context.browser.driver.find_element(By.XPATH, "//slycat-model-results//a[contains(.,'here')]").get_attribute("href").split("/").pop()
  context.browser.find_by_text("button", "Go To Model").click()

@then(u'I should be on the model page')
def step_impl(context):
  context.browser.find_by_text("a", context.model_name)
  nose.tools.assert_true(context.browser.driver.current_url.endswith(context.mid))
  context.browser.wait_until_hidden((By.XPATH, "//div[contains(@class, 'slycat-navbar-alert')]/p[contains(.,'waiting')]"))
