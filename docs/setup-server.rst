.. _Setup Slycat Web Server:

Setup Slycat Web Server
=======================

Note: If you're new to Slycat and are here give it a try, please see
:ref:`Install Slycat` instead. The following is a guide for
users who are ready to setup their own Slycat Web Server for production.

Use the Docker Image
--------------------

Many administrators should be able to use the Slycat Docker image in production directly, 
and we strongly urge you to give this approach a shot - after
following the instructions to :ref:`Install Slycat`, you would simply make a few
configuration changes (assigning real passwords to the root and slycat users, replacing
our self-signed server certificate with one of your own, changing the listening port, locking-down ssh access, etc.)
then continue using the image in production.  Because the Slycat Docker image is a container
rather than a VM, there is absolutely no performance penalty for using it in this configuration.
You can even use Docker to automate this process, building your own site-specific Slycat image
with our Slycat image as the base!

Installing Slycat from Scratch
------------------------------

If you insist on creating your own Slycat instance from scratch, 
we still prefer to point you to our `Dockerfiles` for
information on installing Slycat and its dependencies, because these files are the actual scripts
that we use to build the Slycat Docker image - thus they're an
always-up-to-date and unambiguous specification of how to build a Slycat
server.  Even if you don't use Docker, the Dockerfiles
are easy to understand and adapt to your own processes.

You will find our Dockerfiles in a set of directories located in the `docker`
directory within the Slycat repo:

  https://github.com/sandialabs/slycat/tree/master/docker

There, you will find four subdirectories - `supervisord`, `sshd`, and `slycat`
- which are used to build four Docker images.  Each image builds on the
previous, adding new functionality:

* supervisord - Starts with a Fedora Core base system, and adds an instance of supervisord that
  will be used to startup the other processes.
* sshd - Installs an SSH server on top of the supervisord image, and configures supervisord
  to automatically start it when the container is run.
* slycat - Installs the Slycat server and its dependencies atop the sshd image, and configures
  supervisord to automatically start it when the container is run.
* slycat-dev - Adds development tools to the base Slycat image, and disables automatic Slycat
  startup so developers can run it themselves.

The main differences between platforms will be in how you install the various
dependencies.  One platform - such as Fedora Core in our Dockerfile - installs
the Python h5py module and its compiled hdf5 library dependency using a single
yum package, while another platform - such as Centos 6 - provides a yum package
for hdf5, but no package for the Python h5py module, so you have to use pip to
install it.  Unfortunately, we can't enumerate all the possibilities here, so
you'll have to begin with the packages listed in the Dockerfile, and
generalize to your platform.

Configuring Slycat Web Server
-----------------------------

Whether you're setting-up an unmodified Slycat Web Server or developing new
capabilities to suit your needs, you will need to know how to modify its
configuration.  When you start Slycat Web Server::

  $ cd slycat/web-server
  $ python slycat-web-server.py

... it automatically loads a file `config.ini` from the same directory as slycat-web-server.py.
The sample `config.ini` that we provide with the source code is designed
to start Slycat in a state that's useful for developers, so you'll likely want
to copy it to some other filesystem location, modify it, and point Slycat to
the modified `config.ini` instead.  Once you've done that, you can specify the config file location
at startup using the command-line::

  $ python slycat-web-server.py --config=/etc/slycat/config.ini

The `config.ini` file is an INI file divided into sections using square braces.
The `[slycat]` section is reserved for configuration specific to the
functionality of the Slycat server, while the `[global]` section and any
sections starting with a slash (for example: `[/style]`) are used to configure
the `CherryPy <http://www.cherrypy.org>`_ web server that Slycat is based upon.

The values for each setting in `config.ini` must be valid Python expressions.
You should note that in the sample `config.ini` we provide, some values are
simple scalars, such as `[global] server.socket_port`, while some values create
object instances, such as `[slycat] directory`, which creates a directory
object that will handle user lookups.  This provides great flexibility to
customize Slycat for your network.  Here are some common settings you may wish
to modify:

[global] Section
^^^^^^^^^^^^^^^^

* engine.autoreload.on - Controls whether Slycat will automatically restart when the source code is modified.  This is typically disabled in production.
* require.show_tracebacks - Controls whether exceptions during request handling will return debugging information to the client.  This is typically disabled in production.
* server.socket_host - IP address of the interface to listen on for requests.  Use "0.0.0.0" to listen on all interfaces.  Use "127.0.0.1" to only accept requests from the local machine.
* server.socket_port - TCP port number to listen on for requests.  Defaults to "8092" for development.  Typically set to "443" in production with SSL enabled, or "80" with SSL disabled.
* server.ssl_certificate - Path to a certificate used for SSL encryption.  Leave blank to disable SSL.  Relative paths are relative to the slycat-web-server.py executable.
* server.ssl_private_key - Path to a private key used for SSL encryption.  Leave blank to disable SSL.  Relative paths are relative to the slycat-web-server.py executable.
  
[slycat] Section
^^^^^^^^^^^^^^^^

* allowed-markings - List of marking types that may be assigned to models.
* plugins - List of directories from which plugins will be loaded.  Relative paths are relative to the slycat-web-server.py executable.
* server-admins - List of users allowed to administer the Slycat server.  Server administrators have full read/write access to all projects, regardless of project ACLs.
  
