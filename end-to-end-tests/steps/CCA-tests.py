# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

__author__ = 'mletter'

from behave import *
import time
import re
import os
from PIL import Image, ImageChops
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.action_chains import ActionChains


def are_images_equal(img_actual, img_expected, result):
  """
    :param img_actual: the image we want to compare
    :param img_expected: the base image
    :param result: path Result image will look black in places where the two images match
    :return: true if the images are identical(all pixels in the difference image are zero)
  """

  result_flag = False

  # Check that img_actual exists
  if not os.path.exists(img_actual):
    print('Could not locate the generated image: %s' % img_actual)

  # Check that img_expected exists
  if not os.path.exists(img_expected):
    print('Could not locate the baseline image: %s' % img_expected)

  if os.path.exists(img_actual) and os.path.exists(img_expected):
    actual = Image.open(img_actual)
    expected = Image.open(img_expected)
    result_image = ImageChops.difference(actual, expected)

    # Where the real magic happens
    if (ImageChops.difference(actual, expected).getbbox() is None):
      result_flag = True

    # code to store the overlay
    # Result image will look black in places where the two images match
    color_matrix = ([0] + ([255] * 255))
    result_image = result_image.convert('L')
    result_image = result_image.point(color_matrix)
    result_image.save(result)  # Save the result image

  return result_flag

@given('we can navigate to our example CCA model')
def impl(context):
  # create project
  context.browser.get(context.server_url + "/projects")
  context.browser.implicitly_wait(300)
  context.browser.find_element(By.CSS_SELECTOR, "#slycat-projects > div > div > div > a:nth-child(2)").click()
  context.browser.find_element(By.CSS_SELECTOR,
                               "#slycat-project > div:nth-child(1) > div > div > a:nth-child(1)").click()
  # give the plot a sec to load
  time.sleep(2)


@given('we can navigate to the main projects window and create a CCA model from Cars csv')
def impl(context):
  # create project
  context.browser.get(context.server_url + "/projects")
  context.browser.implicitly_wait(30)
  context.browser.find_element(By.CSS_SELECTOR, "#slycat-create-wizards").click()
  context.browser.find_element(By.CSS_SELECTOR, "#slycat-navbar-content > div > div.btn-group.open > ul > li.slycat-clickable > a").click()
  context.browser.find_element(By.CSS_SELECTOR, "#slycat-create-project-name").send_keys("selenium-test")
  context.browser.find_element(By.CSS_SELECTOR, "#slycat-wizard > div.modal-dialog > div > div > div > div.modal-footer > li").click()
  time.sleep(5)
  #create model
  context.browser.find_element(By.CSS_SELECTOR, "#slycat-create-wizards").click()
  context.browser.find_element(By.CSS_SELECTOR, "#slycat-navbar-content > div > div.btn-group.open > ul > li:nth-child(3) > a").click()
  context.browser.find_element(By.CSS_SELECTOR, "#slycat-wizard > div.modal-dialog > div > div > div > div.modal-footer > button:nth-child(2)").click()
  # context.browser.find_element(By.CSS_SELECTOR, "#slycat-local-browser-file").click()
  context.browser.find_element(By.CSS_SELECTOR, "#slycat-local-browser-file").send_keys("/Users/mletter/Documents/gitRepos/slycat/data/cars.csv")
  context.browser.find_element(By.CSS_SELECTOR, "#slycat-wizard > div.modal-dialog > div > div > div > div.modal-footer > button.btn.btn-primary.local-browser-continue.browser-continue").click()
  context.browser.implicitly_wait(30)
  context.browser.find_element(By.CSS_SELECTOR, "#slycat-wizard > div.modal-dialog > div > div > div > div.modal-body > div > div:nth-child(5) > slycat-table-ingestion > div > table > tbody > tr:nth-child(2) > td:nth-child(3) > input[type=\"radio\"]").click()

  context.browser.find_element(By.CSS_SELECTOR, "#slycat-wizard > div.modal-dialog > div > div > div > div.modal-footer > button:nth-child(6)").click()
  context.browser.implicitly_wait(30)
  context.browser.find_element(By.CSS_SELECTOR, "#slycat-wizard > div.modal-dialog > div > div > div > div.modal-footer > button:nth-child(7)").click()

  time.sleep(5)


@when('we have the Scatterplot load')
def impl(context):
  # Get the canvas image
  png_url = context.browser.execute_script('return document.getElementById("scatterplot").toDataURL("image/png");')

  # Parse the URI to get only the base64 part
  str_base64 = re.search(r'base64,(.*)', png_url).group(1)

  # Convert it to binary
  str_decoded = str_base64.decode('base64')

  # Write out the image somewhere
  output_img = "test-img.png"
  fp = open(output_img, 'wb')
  fp.write(str_decoded)
  fp.close()
  time.sleep(5)
  # canvas = context.browser.find_element_by_id("scatterplot")
  # plot = ActionChains(context.browser).move_to_element_with_offset(canvas, -104, -80).click()
  # plot.perform()


@then('we should have an accurate Scatterplot')
def impl(context):
  assert are_images_equal("actual-img.png", "test-img.png", "imgs-diff.png")
  assert context.failed is False


