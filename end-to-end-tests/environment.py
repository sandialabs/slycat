"""
This file is used for the setup and breakdown of out testing environment
"""

import os

__author__ = 'mletter'
__server__ = os.environ['SLYCAT_TEST_SERVER']

from selenium import webdriver
import time

def before_all(context):
  """
  befoer we run our tests we need to grab a browser
  :param context: the object that will be passed to all our tests
  :return: not used
  """
  context.browser = webdriver.Firefox()
  # Resize the window to the screen width/height
  context.browser.set_window_size(800, 600)

  # Move the window to position x/y
  context.browser.set_window_position(200, 200)
  context.browser.implicitly_wait(2)
  context.server_url = __server__

def after_all(context):
  """
  we have a running browser so we need to kill it after we are done
  :param context: the object that will be passed to all our tests
  :return: not used
  """
  context.browser.quit()
