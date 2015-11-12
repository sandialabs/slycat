__author__ = 'mletter'

from behave import *
import time
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException
from selenium.common.exceptions import TimeoutException

@given('we have behave installed')
def impl(context):
    context.browser.get(context.server_url+"/projects")
    context.browser.find_element(By.CSS_SELECTOR, "#slycat-projects > div > div > div > a:nth-child(2)").click()
    context.browser.find_element(By.CSS_SELECTOR, "#slycat-project > div:nth-child(1) > div > div > a:nth-child(1)").click()
    context.browser.find_element(By.CSS_SELECTOR, "#table > div.slick-viewport > div > div:nth-child(2)").click()
    #table > div.slick-viewport > div > div.ui-widget-content.slick-row.even.active > div.slick-cell.l5.r5.rowInput.active.selected
    time.sleep(10)
    pass

@when('we implement a test')
def impl(context):
    assert True is not False

@then('behave will test it for us!')
def impl(context):
    assert context.failed is False