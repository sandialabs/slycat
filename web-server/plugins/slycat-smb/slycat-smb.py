# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

# coding=utf-8
def register_slycat_plugin(context):
  import os

  def page_html(database, model):
    import pystache
    context = dict()
    return pystache.render(open(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../dist/ui_smb.html")), "r").read(), context)

  '''

  Register a custom page

  Running this code:

    - Configure your web server to load the slycat-run-command plugin by adding it to the /etc/slycat/web-server-config.ini for the developer image
    - Point a browser to https://your-slycat-server/pages/run-command

  '''
  context.register_page("smb", page_html)