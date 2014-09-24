.. _Plugins:

Plugins
=======

We have recently introduced a new plugin system for Slycat.  This system is
intended to streamline the process of customizing and adding new Slycat
features.  As of this writing we've extracted a small amount of Slycat
functionality and moved it into plugins, and this process will continue until
all Slycat model, marking, directory, and authentication functionality is
converted to the plugin system.

General Functionality
---------------------

A Slycat plugin is Python module (.py file) that is loaded into the Slycat Web
Server at startup.  By default, the Slycat server searches for plugins in a
directory named `plugins` in the same directory as the server itself.  This
behavior can be customized by editing the `config.ini` file included with the
Slycat source code, or by using a different config file altogether.  The
`plugins` entry in `config.ini` is a Python list containing zero-or-more paths
to plugin directories, so developers can append their own paths to the list to
deploy their plugins.  Slycat will attempt to load every .py file it locates
within every plugin directory specified in the configuration.

Once all plugin modules have been loaded, the server will call the
`slycat_register_plugin` function in each module, if it exists.  The function
will be called with a `context` object as its sole argument.  The plugin code,
in-turn, will use the API provided by the `context` object to register new
functionality.  This explicit registration process allows a single plugin module
to register as many new capabilities as it wishes, and the registration API
will expand as we add new categories of plugin functionality to the server.

Model Plugins
-------------

A model plugin adds a new type of model to the Slycat server.  In this context,
a plugin model consists of the following:

* A unique string identifier called the `model type`.
* Code that will be executed on the server when a model is `finished` (i.e.
  one-time computation to perform after the model's input artifacts have been stored).
* A block of HTML code that will be used as the model's interactive user interface.  This
  block of HTML will be inserted into a larger HTML frame that provides common functionality
  for manipulating models, and delivered to the end-user's client.
* Future: additional code that can be executed on the server when requested by the model HTML.
* Future: additional Javascript and CSS resources for use by the model HTML.
* Future: a means for the model to reigster a "wizard" to be used for creating new instances
  of the model directly from the Slycat browser user interface.

Here is a bare-minimum example of a do-nothing plugin (a copy of this code is already located
at `slycat/web-server/plugins/test_plugin.py`)::

  def register_slycat_plugin(context):

    def finish(database, model):
      import datetime
      import slycat.web.server.model
      slycat.web.server.model.update(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

    def html(database, model):
      return "<h1>Hello, World!</h1>"

    context.register_model("test", finish, html)

Note that finish() simply marks the model as "finished" so clients will know
that the model is ready to view, and the html() function returns a familiar
message.

If you save this code to a directory where the Slycat server can find it and
restart the server, the plugin will be loaded into the server and register a
new `test` model type.  To actually create an instance of a `test` model,
you'll need some way to create it.  The easiest way is to use a script to
create `test` model instances (again, the following code is already included in
the Slycat source tree at `slycat/web-client/slycat-demo-test-model.py`)::

  import slycat.web.client

  parser = slycat.web.client.option_parser()
  parser.add_argument("--marking", default="", help="Marking type.  Default: %(default)s")
  parser.add_argument("--model-name", default="Demo Test Model", help="New model name.  Default: %(default)s")
  parser.add_argument("--project-name", default="Demo Test Project", help="New project name.  Default: %(default)s")
  arguments = parser.parse_args()

  connection = slycat.web.client.connect(arguments)

  pid = connection.find_or_create_project(arguments.project_name)

  mid = connection.post_project_models(pid, "test", arguments.model_name, arguments.marking)

  connection.post_model_finish(mid)
  connection.join_model(mid)

  slycat.web.client.log.info("Your new model is located at %s/models/%s" % (arguments.host, mid))

In this case the script provides a simple command line interface for specifying the name and marking
for the model, along with the name of a new or existing project to contain the new model.  Once the
connection to the Slycat server has been made and the project identified or created, the new model
is created and immediately finished (causing the finish() function to be called).  If you view the
new model in a web browser, it will display "Hello, World!", which was returned from the plugin
html() function.


