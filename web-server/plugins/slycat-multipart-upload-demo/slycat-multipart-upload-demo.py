# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

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

    - Configure your web server to load the slycat-multipart-upload-demo plugin by adding it to the /etc/slycat/web-server-config.ini for the developer image
    - Point a browser to https://your-slycat-server/pages/multipart-upload-demo
    - Use the file chooser button to point your browser to a copy of slycat/data/cars.csv (demo is hard-coded to work with this file).
    - Click “Upload”.
    - The plugin code splits the file into two pieces, uploads them separately to a CCA model, and finishes.
      - you can see this in the network analyzer from any browser
    - Visit the new model to see that everything looks the way it should be.

  '''
  context.register_page("multipart-upload-demo", page_html)
  # context.register_page_bundle("multipart-upload-demo", "text/javascript", [
  #   os.path.join(os.path.dirname(__file__), "file_uploader_factory.js")
  #   ])