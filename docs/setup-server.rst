.. _Setup Slycat Web Server:

Setup Slycat Web Server
=======================

Note: If you're new to Slycat and are here give it a try, please see
:ref:`Install Slycat` instead. The following outlines how we setup the Slycat
Web Server when we build the Slycat Docker image.  It's intended as a guide for
advanced users who are interested in setting-up Slycat Web Server on their own
hardware.  Of course, you'll have to adjust this information for your own OS.

The Slycat Repository
---------------------

First things first ... you can find the Slycat repository at
http://github.com/sandialabs/slycat which includes the Slycat
source code, issue tracker, and wiki.

Using the Dockerfiles
---------------------

We prefer to point new Slycat administrators to our `Dockerfiles` for
information on setting-up Slycat, because these files are the actual scripts
that we use to build the Slycat Docker image - thus they're an
always-up-to-date and unambiguous specification of how to build a Slycat
server.  Ideally, we encourage you to use the Slycat docker image as a
starting-point for your own Slycat server instance, perhaps using our
`sandialabs/slycat` image as the base for your own Docker image customized to
suit your production environment.  But even if you don't use Docker, the
Dockerfiles are easy to understand and adapt to your own processes.

You will find our Dockerfiles in a set of directories located in the `docker`
directory within the Slycat repo:

  https://github.com/sandialabs/slycat/tree/master/docker

There, you will find three subdirectories used to build Docker images.  The
first image, located in the `supervisord` directory, is the starting-point for
the Slycat server.  If you view `supervisord/Dockerfile`, you will see how we
begin with Fedora 20, and install the supervisord daemon.  Next, the `sshd`
directory contains instructions in `sshd/Dockerfile` to install an SSH server
on top of the supervisord image.  Finally `slycat/Dockerfile` does the rest of
the work to install Slycat and its dependencies on top of the sshd image.

The main differences between platforms will be in how you install the various
dependencies.  One platform - such as Fedora 20 in our Dockerfile - might
install the Python h5py library and its compiled hdf5 library dependency using
a single yum package, where another platform - such as Centos 6 - would provide
a yum package for hdf5, and you would use pip to install the Python h5py
package.  Unfortunately, we can't enumerate all the possibilities here, so
you'll have to start with the packages listed in the Dockerfile, and generalize
to your platform.
