import distutils.spawn
import getpass
import os
import sys

def before_all(context):
  context.server_host = os.environ.get("SLYCAT_TEST_SERVER", "https://localhost")
  context.server_proxy = os.environ.get("SLYCAT_TEST_SERVER_PROXY", "")
  context.server_user = os.environ.get("SLYCAT_TEST_SERVER_USER", "slycat")
  context.server_password = getpass.getpass("%s password: " % context.server_user) if "SLYCAT_TEST_SERVER_USER" in os.environ else "slycat"
  context.local_ffmpeg = distutils.spawn.find_executable("ffmpeg")

def after_scenario(context, scenario):
  if scenario.feature.name == "REST API":
    if "pid2" in context:
      try:
        context.connection.delete_project(context.pid2)
      except:
        pass
    if "pid" in context:
      try:
        context.connection.delete_project(context.pid)
      except:
        pass
