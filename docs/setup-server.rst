.. _Setup Slycat Web Server:

Setup Slycat Web Server
=======================

Note: If you're new to Slycat and are here give it a try, please see
:ref:`Install Slycat` instead. The following is a guide for
advanced users who are interested in setting-up Slycat Web Server on their own
hardware.  Of course, you'll have to adjust this information for your own OS.

Use the Docker Image
--------------------

Many administrators should be able to use the Slycat Docker image in production directly, 
and we strongly urge you to give this approach a shot - after
following the instructions to :ref:`Install Slycat`, you would simply make a few
configuration changes (assigning real passwords to the root and slycat users, replacing
our self-signed server certificate with one of your own, locking-down ssh access, etc.)
then continue using the image in production.  Because the Slycat Docker image is a container
rather than a VM, there is absolutely no performance penalty for using it in this configuration.
You can even use Docker to automate the process of creating your own site-specific Slycat image
using Slycat as the base image!

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

There, you will find three subdirectories - `supervisord`, `sshd`, and `slycat`
- which are used to build three Docker images.  Each image builds on the
previous, adding new functionality:

* supervisord - Starts with a Fedora 20 image, and adds an instance of supervisord that
  will be used to startup the other processes.
* sshd - Installs an SSH server on top of the supervisord image, and configures supervisord
  to automatically start it when the container is run.
* slycat - Installs the Slycat server and its dependencies atop the sshd image, and configures
  supervisord to automatically start it when the container is run.

The main differences between platforms will be in how you install the various
dependencies.  One platform - such as Fedora 20 in our Dockerfile - installs
the Python h5py module and its compiled hdf5 library dependency using a single
yum package, where another platform - such as Centos 6 - provides a yum package
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
the modified `config.ini` instead.  To do so, you would specify the config file location
using the command-line::

  $ python slycat-web-server.py --config=/etc/slycat/config.ini

The `config.ini` file is an INI file divided into sections using square braces.
The `[slycat]` section is reserved for configuration specific to the
functionality of the Slycat server, while the `[global]` section and any
sections starting with a slash (for example: `[/style]`) are used to configure
the `CherryPy <http://www.cherrypy.org>`_ server that Slycat is based upon.

The values for each setting in `config.ini` must be valid Python expressions.
You should note that in the sample `config.ini` we provide, some values are
simple scalars, such as `[global] server.socket_port`, while some values create
object instances, such as `[slycat] directory`, which creates a directory
object that will handle user lookups.  This provides great flexibility to
customize Slycat for your network.  Here are some common settings you may wish
to modify::

  [global]
  engine.autoreload.on - When set to True, Slycat will restart any time the source code is modified.  This is typically disabled in production.
  require.show_tracebacks - When set to True, failed client requests will return debugging information for the server code that failed.  This is typically disabled in production.
  server.ssl_certificate - Path to a certificate used for SSL encryption.  Relative paths are relative to the slycat-web-server.py executable.
  server.ssl_private_key - Path to a private key used for SSL encryption.  Relative paths are relative to the slycat-web-server.py executable.
  
  [slycat]
  allowed-markings - Set to a list of marking types that may be assigned to models.
  plugins - Set to a list of directories from which plugins will be loaded.  Relative paths are relative to the slycat-web-server.py executable.
  server-admins - List of users allowed to administer Slycat.
  
