# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import argparse
import datetime
import os
import subprocess
import sys

# Get the current commit and time.
commit = subprocess.Popen(["git", "rev-parse", "HEAD"], stdout=subprocess.PIPE).communicate()[0].strip()[:8]
timestamp = datetime.datetime.now()

def build_image(image):
  subprocess.check_call(["docker", "build", "--no-cache=%s" % ("true" if arguments.no_cache else "false"), "-t", "sandialabs/%s" % image, image])

def save_image(image):
  saved_image = "%s-%s-%s.image" % (image, timestamp.strftime("%Y%m%dT%H%M"), commit)
  sys.stderr.write("Saving image %s as %s.\n" % (image, saved_image))
  subprocess.check_call(["docker", "save", "-o", saved_image, "sandialabs/%s" % image])

def build_slycat_base():
  build_image("slycat-base")

def build_slycat_developer():
  build_slycat_base()
  build_image("slycat-developer")

def slycat_developer_image():
  build_slycat_developer()
  save_image("slycat-developer")

targets = {
  "slycat-developer": build_slycat_developer,
  "slycat-developer-image": slycat_developer_image,
}

parser = argparse.ArgumentParser()
parser.add_argument("--no-cache", action="store_true", help="Don't use existing cached images.")
parser.add_argument("target", choices=targets.keys(), help="Target to build.")
arguments = parser.parse_args()

targets[arguments.target]()

