# coding=utf-8
def register_slycat_plugin(context):
  import os

  def page_html(database, model):
    import pystache
    context = dict()
    return pystache.render(open(os.path.join(os.path.dirname(__file__), "ui.html"), "r").read(), context)

  '''

  Register a custom page

  Running this example code:

    - Configure your web server to load the slycat-login plugin by adding it to the /etc/slycat/web-server-config.ini for the developer image
    - Point a browser to https://your-slycat-server/pages/login

  '''
  context.register_page("run-command", page_html)