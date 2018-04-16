# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

"""Stress-test a Slycat server by automating access using a Firefox web-browser and a read-only workload."""

from selenium import webdriver
from selenium.webdriver.support import expected_conditions
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import NoSuchElementException, TimeoutException

import argparse
import getpass
import json
import requests
import time
import urlparse

parser = argparse.ArgumentParser()
parser.add_argument("--max-model-count", type=int, default=500, help="The number of models a browser may view before being restarted.  Default: %(default)s")
parser.add_argument("--url", default="https://localhost:8092", help="Root Slycat URL to test.  Default: %(default)s")
parser.add_argument("--user", default=getpass.getuser(), help="Slycat username.  Default: %(default)s")
arguments = parser.parse_args()

scheme, netloc, path, params, query, fragment = url = urlparse.urlparse(arguments.url)
netloc = "{}:{}@{}".format(arguments.user, getpass.getpass("{} password: ".format(arguments.user)), netloc)
url = urlparse.urlunparse((scheme, netloc, path, params, query, fragment))

pass_count = 0
project_count = 0
model_count = 0

browser = None

while True:
  if browser is None:
    try:
      browser = webdriver.Firefox()
    except:
      raise Exception("Error starting web browser.  This is likely due to network proxy configuration, try clearing the http_proxy environment variable if set.")
    browser.get(url)
    WebDriverWait(browser, 10).until(expected_conditions.title_contains("Slycat Projects"))
    browser_model_count = 0

  project_index = 0
  while True:
    project_links = browser.find_elements_by_class_name("project-link")
    if project_index >= len(project_links):
      break
    project_link = project_links[project_index % len(project_links)]
    project_link.click()
    WebDriverWait(browser, 10).until(expected_conditions.title_contains("Slycat Project"))

    model_index = 0
    while True:
      model_links = browser.find_elements_by_class_name("model-link")
      if model_index >= len(model_links):
        break
      model_link = model_links[model_index % len(model_links)]
      model_link.click()
      WebDriverWait(browser, 10).until(expected_conditions.title_contains("Model"))

      try:
        status_messages =  browser.find_element_by_id("status-messages")
        WebDriverWait(browser, 2).until(expected_conditions.visibility_of(status_messages))
        # This is an incomplete CCA model.
      except TimeoutException:
        # This is a complete CCA model.
        time.sleep(8)
      except NoSuchElementException:
        # This is not a CCA model.
        pass

      browser_model_count += 1
      model_count += 1
      print "Viewed %s models." % model_count

      browser.back()
      WebDriverWait(browser, 10).until(expected_conditions.title_contains("Slycat Project"))
      model_index += 1

    project_count += 1
    print "Viewed %s projects." % project_count

    browser.back()
    WebDriverWait(browser, 10).until(expected_conditions.title_contains("Slycat Projects"))
    project_index += 1

  pass_count += 1
  print "Completed %s passes." % pass_count

  # Web browsers are notorious memory leakers, so kill the browser periodically to prevent slowdowns / failures.
  if browser_model_count >= arguments.max_model_count:
    print "Restarting browser."
    browser.quit()
    browser = None

if browser is not None:
  browser.quit()

