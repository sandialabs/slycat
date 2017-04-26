import distutils.spawn
import getpass
import os
import sys

def before_all(context):
  context.project_admin_password = getpass.getpass("%s password: " % context.project_admin_user) if "SLYCAT_PROJECT_ADMIN_USER" in os.environ else "project-admin"
  context.project_admin_user = os.environ.get("SLYCAT_PROJECT_ADMIN_USER", "project-admin")
  context.project_outsider_password = getpass.getpass("%s password: " % context.project_outsider_user) if "SLYCAT_PROJECT_OUTSIDER_USER" in os.environ else "project-outsider"
  context.project_outsider_user = os.environ.get("SLYCAT_PROJECT_OUTSIDER_USER", "project-outsider")
  context.project_reader_password = getpass.getpass("%s password: " % context.project_reader_user) if "SLYCAT_PROJECT_READER_USER" in os.environ else "project-reader"
  context.project_reader_user = os.environ.get("SLYCAT_PROJECT_READER_USER", "project-reader")
  context.project_writer_password = getpass.getpass("%s password: " % context.project_writer_user) if "SLYCAT_PROJECT_WRITER_USER" in os.environ else "project-writer"
  context.project_writer_user = os.environ.get("SLYCAT_PROJECT_WRITER_USER", "project-writer")
  context.remote_host = os.environ.get("SLYCAT_REMOTE_HOST", "localhost")
  context.remote_password = getpass.getpass("%s password: " % context.remote_user) if "SLYCAT_REMOTE_USER" in os.environ else "slycat"
  context.remote_user = os.environ.get("SLYCAT_REMOTE_USER", "slycat")
  context.server_admin_password = getpass.getpass("%s password: " % context.server_user) if "SLYCAT_SERVER_ADMIN_USER" in os.environ else "slycat"
  context.server_admin_user = os.environ.get("SLYCAT_SERVER_ADMIN_USER", "slycat")
  context.server_host = os.environ.get("SLYCAT_SERVER", "https://localhost")
  context.server_proxy = os.environ.get("SLYCAT_SERVER_PROXY", "")

def after_scenario(context, scenario):
  if scenario.feature.name == "REST API":
    if "sid" in context:
      try:
        context.project_admin.delete_remote(context.sid)
      except:
        pass
    if "pid4" in context:
      try:
        context.project_admin.delete_project(context.pid4)
      except:
        pass
    if "pid3" in context:
      try:
        context.project_admin.delete_project(context.pid3)
      except:
        pass
    if "pid2" in context:
      try:
        context.project_admin.delete_project(context.pid2)
      except:
        pass
    if "pid" in context:
      try:
        context.project_admin.delete_project(context.pid)
      except:
        pass
