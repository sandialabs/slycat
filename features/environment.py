import getpass
import os
import sys

def before_all(context):
  context.server_host = os.environ.get("SLYCAT_TEST_SERVER", "https://localhost")
  context.server_proxy = os.environ.get("SLYCAT_TEST_SERVER_PROXY", "")
  context.server_user = os.environ.get("SLYCAT_TEST_SERVER_USER", "slycat")
  context.server_password = getpass.getpass("%s password: " % context.server_user) if "SLYCAT_TEST_SERVER_USER" in os.environ else "slycat"
