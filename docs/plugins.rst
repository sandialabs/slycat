.. _plugins:

Plugins
=======

The Slycat server includes a plugin system that streamlines the process of
customizing it to suit your environment and adding new Slycat features.

Overview
--------

A Slycat plugin is a Python module (.py file) that is loaded into the Slycat Web
Server at startup.  By default, Slycat ships with a set of plugins in the
`web-server/plugins` directory.  The set of plugins to be loaded is specified
in the server's `config.ini` file.  The `plugins` entry in `config.ini` is a
Python list containing zero-or-more plugin locations, which may be individual
.py files to be loaded, or directories.  Every .py file in a directory will be
loaded as a plugin, but directories are not searched recursively. Relative
paths are relative to the slycat-web-server.py executable.  Plugin developers
can append their own paths to the list to deploy their plugins, by editing the
`config.ini` file included with the Slycat source code, or by using a different
config file altogether.

Once all plugin modules have been loaded, the server will call the
`register_slycat_plugin` function in each module, if it exists.  The function
will be called with a `context` object as its sole argument.  The plugin code
uses the API provided by the `context` object to register new functionality
with the server.  This explicit registration process allows a single plugin
module to register as many new capabilities as it wishes, and the registration
API continues to expand as we add new categories of plugin functionality to the
server.

.. NOTE::

  You are free to register as many plugins or as many *types* of plugins as you
  like within a plugin module - you are not obliged to split your code into one
  plugin per module, unless you want to.  For example, if your organization
  created a new type of model and had three in-house marking types, you could
  put all four plugins in a single, organization-specific plugin module.

.. WARNING::

  Plugin module names must be globally unique - that is, the filename of all
  plugin .py files loaded by the server must be unique, not just the filepaths.
  Thus, you should not use generic filenames like `plugin.py` for plugin
  modules. Instead, incorporate functionality- or organziation-specific strings
  into the filenames such as `bayesian-q-stat-model.py` or
  `acme-dynamite-division-authentication.py`.  The prefix `slycat-` is reserved
  for plugin modules shipped with Slycat.

New Marking Types
-----------------

`Examples: plugins/slycat-no-marking.py, plugins/slycat-airmail-marking.py, plugins/slycat-faculty-only-marking.py`

A plugin can register new `marking` types with the Slycat server.  Markings are
used to apply user-specific administrative or organizational labels to models such as "Draft"
or "Human Resources Only".

A marking consists of the following:

1) A unique string identifier called the `marking type`.
2) A human-readable label that will become part of the user interface when prompting end-users to choose the marking for a model.
3) A block of HTML markup that provides a "badge" representation of the marking used in lists.
4) Optional block of HTML markup that will be inserted into the user interface before marked content.
5) Optional block of HTML markup that will be inserted into the user interface after marked content.

If the plugin doesn't provide 5), 4) will be displayed at the top and bottom of
marked content.  If 4) and 5) are omitted, 3) will be displayed at the top and
bottom of marked content.

In practice, most marking plugins should include inline style information in
their HTML markup to control the appearance of the marking.  Note that models
can currently have a single marking applied.

New Model Types
---------------

`Examples: plugins/slycat-hello-world, plugins/slycat-linear-regression-demo, plugins/slycat-bookmark-demo`

A plugin can add a new type of model to the Slycat server.  In this context,
a plugin model consists of the following:

* A unique string identifier called the `model type`.
* Code that will be executed on the server when a model is `finished` (i.e.
  one-time computation to perform after the model's input artifacts have been stored).
* A block of HTML code that will be used as the model's interactive user interface.  This
  block of HTML will be inserted into a larger HTML frame that provides common functionality
  for manipulating models, and delivered to the end-user's client.

Here is a bare-minimum example of a do-nothing model plugin::

  def register_slycat_plugin(context):

    def finish(database, model):
      import datetime
      import slycat.web.server.model
      slycat.web.server.model.update(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

    def html(database, model):
      return "<h1>Hello, World!</h1>"

    context.register_model("my-model", finish, html)

Note that finish() simply marks the model as "finished" so clients will know
that the model is ready to view, and the html() function returns a familiar
message.

When the Slycat server starts, the plugin will be loaded into the server and
register a new `my-model` model type.  Of course, you'll need some way to
actually create an instance of a `my-model` model.  The easiest way is to
use a script to create `my-model` model instances::

  import slycat.web.client

  parser = slycat.web.client.option_parser()
  parser.add_argument("--marking", default="", help="Marking type.  Default: %(default)s")
  parser.add_argument("--model-name", default="Hello World Model", help="New model name.  Default: %(default)s")
  parser.add_argument("--project-name", default="Hello World Project", help="New project name.  Default: %(default)s")
  arguments = parser.parse_args()

  connection = slycat.web.client.connect(arguments)

  pid = connection.find_or_create_project(arguments.project_name)

  mid = connection.post_project_models(pid, "my-model", arguments.model_name, arguments.marking)

  connection.post_model_finish(mid)
  connection.join_model(mid)

  slycat.web.client.log.info("Your new model is located at %s/models/%s" % (arguments.host, mid))

In this case the script provides a simple command line interface for specifying the name and marking
for the model, along with the name of a new or existing project to contain the new model.  Once the
connection to the Slycat server has been made and a project identified or created, the new model
is created and immediately finished (causing the finish() function to be called).  When you view the
new model in a web browser, it will display the content returned by the plugin's
html() function.

Model Commands
--------------

`Examples: plugins/slycat-matrix-demo-model`

Typically, we assume that a Slycat model is created, artifacts are ingested,
one-time server-side computation is performed (using a model plugin's
`finish()` function), then a web browser provides interactive visualization of
the results (using the output of a model plugin's `html()` function).

However, in some circumstances this may be insufficient - a model may need to
provide additional server-side computation to be executed by the client.  In
this case, a model command plugin is used to register additional server-side
`commands` that can be invoked by the client.

..
  Model Wizard Plugins
  --------------------
  To fully integrate a new model into Slycat, some way for users to create new
  instances of the model is required.  In the model plugin example above we assume
  that client-side scripts will be invoked by users to create model instances.  `Wizard`
  plugins provide a way for users to create new model instances using their web browsers.

Password Check Plugins
----------------------

`Examples: plugins/slycat-identity-password-check.py, plugins/slycat-ldap-password-check.py`

Password check plugins are callbacks that are executed whenever the server needs to
verify a user's credentials.  The password check plugin registers a callback that will
be called with an authentication realm, username, and password, and returns a tuple
containing `True` if the username and password can be authenticated, and a (possibly empty)
list of groups of which the user is a member::

  def register_slycat_plugin(context):
    def check_password(realm, username, password):
      """Allow any user, so long as their username and password are the same.
      Obviously, this is suitable only for testing."""
      groups = []
      return username and password and username == password, groups

    context.register_password_check("slycat-identity-password-check", check_password)

To use a password check plugin, you would have to add it to your server's
`config.ini`::

  [slycat]
  password-check: {"plugin": "slycat-identity-password-check"}

In a more realistic authentication scenario,
you might use the LDAP password check plugin that ships with Slycat to connect
to an LDAP server.  The following configuration enables the LDAP plugin and
configures it to connect to a public test server::

  [slycat]
  password-check: {"plugin": "slycat-ldap-password-check", "kwargs":{"server":"ldaps://ldap.forumsys.com:389", "user_dn":"uid={},dc=example,dc=com"}}

