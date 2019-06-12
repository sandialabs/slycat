.. _setup-slycat-web-server:

Setup Slycat Web Server
=======================

Note: If you're new to Slycat and are here give it a try, please see
:ref:`install-slycat` instead. The following is a guide for
users who are ready to setup their own Slycat Web Server for production.

Use the Docker Image
--------------------

Many administrators should be able to use the Slycat Docker image in production directly, 
and we strongly urge you to try this approach first - after
following the instructions at :ref:`install-slycat`, you can simply ssh into the running Docker container::

  $ ssh slycat@<docker ip address> -p2222

make a few configuration changes (assign real passwords to the root and slycat users, replace
our self-signed server certificate with one of your own, configure a real password-check plugin, etc.)
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
are easy to understand and adapt to your own workflow and platform.

You will find our Dockerfiles in a set of directories located in the `docker`
directory within the Slycat repo:

  https://github.com/sandialabs/slycat/tree/master/docker

There, you will find four subdirectories - `supervisord`, `sshd`, `slycat`, and `slycat-dev`
- which are used to build four Docker images.  Each image builds on the
previous, adding new functionality:

* supervisord - Starts with a Fedora Core base system, and adds an instance of supervisord that
  will be used to startup the other processes.
* sshd - Installs an SSH server on top of the supervisord image, and configures supervisord
  to automatically start it when the container is run.
* slycat - Installs the Slycat servers and their dependencies atop the sshd image, and configures
  supervisord to automatically start them when the container is run.
* slycat-dev - Adds development tools to the base Slycat image, and configures the supervisorctl
  command so developers can easily start and stop servers themselves.

The main differences between platforms will be in how you install the various
dependencies.  One platform - such as Fedora Core in our Dockerfile - installs
the Python h5py module and its compiled hdf5 library dependency using a single
yum package, while another platform - such as Centos 6 - provides a yum package
for hdf5, but no package for the Python h5py module, so you have to use pip to
install it.  Unfortunately, we can't enumerate all the possibilities here, so
you'll have to begin with the packages listed in our Dockerfiles, and
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
simple scalars, such as `[global] server.socket_port`, while some values are
nested data structures, such as `[slycat] remote-hosts`.  This provides great
flexibility to customize Slycat for your network.  Here are some common
settings you may wish to modify:

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
* plugins - List of filesystem plugin locations.  You may specify individual .py files to be loaded, or directories.  If you specify a directory, every .py file in the directory will be loaded, but directories are `not` searched recursively.  Relative paths are relative to the slycat-web-server.py executable.
* remote-hosts - List containing an entry for each group of hosts that share a specific configuration.  Each entry is a dict containing the following:

    * hostnames - Required list of hostnames that share a configuration.
    * agent - Optional dict configuring remote agent access to the entry hostnames.  Some models require the Slycat Agent when accessing a remote host, and agents must be explicitly configured on a host to be used.  The agent dict must contain the following:

        * command - Required string with the full remote command-line used to run the Slycat agent on the given host.  Typically `/full/path/to/python /full/path/to/slycat-agent.py`.  Since an agent session can be initiated by any user able to login to the remote host via ssh, you should specify required environment variables as part of this command, too (for example, with `env`).

* server-admins - List of users allowed to administer the Slycat server.  Server administrators have full read/write access to all projects, regardless of project ACLs.

