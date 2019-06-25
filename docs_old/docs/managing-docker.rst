.. _managing-docker:

Managing Docker
===============

Here are some tips on managing your Slycat Docker container:

Stopping Slycat
---------------

The processes in the Slycat container that you created with `docker run ...`
will continue running until you stop it::

  $ docker stop slycat

If you are using Boot2Docker to run your Slycat container in a VM on a
non-Linux platform, you may want to shut the VM down too::

  $ boot2docker stop

Starting Slycat
---------------

If you're using Boot2Docker to run your Slycat container on a non-Linux platform, you need to start the VM::

  $ boot2docker start # If you aren't running on a Linux host.

To start the Slycat container::

  $ docker start slycat

... and you're ready to use Slycat again!

