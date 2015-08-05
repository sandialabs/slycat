import argparse
import subprocess

def build_image(image):
  subprocess.check_call(["docker", "build", "-t", "sandialabs/%s" % image, image])

def push_image(image):
  subprocess.check_call(["docker", "push", "sandialabs/%s" % image])

def build_slycat_demo():
  build_image("slycat-demo")

def build_slycat_dev():
  build_slycat_demo()
  build_image("slycat-dev")

def build_slycat_test():
  build_slycat_demo()
  build_image("slycat-test")

def push_slycat_demo():
  build_slycat_demo()
  push_image("slycat-demo")

def push_slycat_dev():
  build_slycat_dev()
  push_image("slycat-dev")

def push_slycat_test():
  build_slycat_test()
  push_image("slycat-test")

targets = {
  "slycat-demo": build_slycat_demo,
  "slycat-dev": build_slycat_dev,
  "slycat-test": build_slycat_test,
  "push-slycat-demo": push_slycat_demo,
  "push-slycat-dev": push_slycat_dev,
  "push-slycat-test": push_slycat_test,
}

parser = argparse.ArgumentParser()
parser.add_argument("target", choices=targets.keys(), help="Target to build.")
arguments = parser.parse_args()

targets[arguments.target]()
