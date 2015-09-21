def register_slycat_plugin(context):
  import os

  def page_html(database, model):
    import pystache
    context = dict()
    return pystache.render(open(os.path.join(os.path.dirname(__file__), "ui.html"), "r").read(), context)

  # Register a custom page.
  context.register_page("multipart-upload-demo", page_html)

