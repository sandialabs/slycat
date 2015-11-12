"""
This file is used for the setup and breakdown of out testing environment
"""

__author__ = 'mletter'

from selenium import webdriver
import time

def before_all(context):
  """
  befoer we run our tests we need to grab a browser
  :param context: the object that will be passed to all our tests
  :return: not used
  """
  context.browser = webdriver.Firefox()
  context.browser.implicitly_wait(2)
  context.server_url = '***REMOVED***'


def after_all(context):
  """
  we have a running browser so we need to kill it after we are done
  :param context: the object that will be passed to all our tests
  :return: not used
  """
  context.browser.quit()
