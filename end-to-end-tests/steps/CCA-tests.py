__author__ = 'mletter'

from behave import *
import time
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException
from selenium.common.exceptions import TimeoutException
import nose.tools


@given('we can navigate to our example CCA model')
def impl(context):
    context.browser.get(context.server_url + "/projects")
    context.browser.find_element(By.CSS_SELECTOR, "#slycat-projects > div > div > div > a:nth-child(2)").click() # select the project
    context.browser.find_element(By.CSS_SELECTOR, "#slycat-project > div:nth-child(1) > div > div > a:nth-child(1)").click() # select the model
    context.browser.find_element(By.CSS_SELECTOR, "#table > div.slick-viewport > div > div:nth-child(2)").click() #select the row
    # try:
    #     nose.tools.assert_equal(context.browser.find_element(By.CSS_SELECTOR, "#table > div.slick-viewport > div > div:nth-child(2)").isPresent)
    # except NoSuchElementException, e:
    #     pass
    # table > div.slick-viewport > div > div.ui-widget-content.slick-row.even.active > div.slick-cell.l5.r5.rowInput.active.selected
    time.sleep(2)


@when('we have navigated to our example model')
def impl(context):
    title = context.browser.title
    nose.tools.assert_equal('New CCA Model - Slycat Model', title)


@then('we should be able to highlight rows in the table')
def impl(context):
    time.sleep(10)
    assert context.failed is False
