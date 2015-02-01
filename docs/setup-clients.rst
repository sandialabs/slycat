.. _setup-slycat-clients:

Setup Slycat Clients
====================

Note: If you're new to Slycat and are here give it a try, please see
:ref:`install-slycat` instead. The following outlines how to setup a host
to use the client scripts included with Slycat to upload data to an
existing Slycat web server. If you don't already have a web server, you
probably want to start with :ref:`setup-slycat-web-server`.

Slycat includes a Python package to simplify writing custom clients.
Custom clients are often required to handle data ingestion, performing
extraction and transformation of your specific data formats into a form
usable by Slycat.

Prerequisites
-------------

You'll need to install the following with your system package manager:

-  git
-  python 2.7

Further, you'll need the following Python modules, installed using
either your system package manager or pip:

-  h5py
-  ipython
-  numpy
-  pyzmq
-  requests
-  scipy

Installation
------------

To use the functionality provided by the Slycat client scripts, you'll
need to obtain a copy of the source code - typically by cloning the
slycat repository from git:

::

    $ cd
    $ git clone git@github.com:sandialabs/slycat.git

Once you've cloned the repository, you need to tell Python where to find
the Slycat package. The easiest way to do this is to add the
slycat/packages directory to your PYTHONPATH environment variable:

::

    $ export PYTHONPATH=-/slycat/packages:$PYTHONPATH

Now, you can run scripts that use the Slycat package.

See Also
--------

-  :ref:`rest-api` - Details the underlying Slycat HTTP API, which can
   be used with any programming language.

