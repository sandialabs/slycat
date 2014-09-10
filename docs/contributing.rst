.. _Contributing to Slycat:

Contributing to Slycat
======================

We hope that you find Slycat useful, and that you'll consider contributing
to the project.  To get you started, here are some tips on how to manage
and develop using the Docker image:

Managing Docker
---------------

The processes in the Slycat container that you created with `docker run ...`
will continue running until you stop it::

  $ docker stop slycat

If you are using Boot2Docker to run your Slycat container in a VM on a
non-Linux platform, you may want to shut the VM down too::

  $ boot2docker stop

And when you're ready to use Slycat again::

  $ boot2docker start # If you aren't running on a Linux host.
  $ docker start slycat

The Slycat Repository
---------------------

You can find the Slycat repository at http://github.com/sandialabs/slycat ... the repository
includes the Slycat source code, issue tracker, and wiki.

Slycat Development with Containers
----------------------------------

Use the following tips to work on Slycat with our Docker container.

* Use `docker logs` to see the output from the Slycat server in a running container::

  $ docker logs -f slycat

* If you login to the Slycat container using ssh, you can edit the source code in-place::

  $ ssh slycat@192.168.59.103 -p2222
  $ cd src/slycat
  $ git pull
  $ vi packages/slycat/...

* To commit changes while logged-in to the container, you'll need to add your
own personal information to `~/.gitconfig`::

  [user]
    name = Fred P. Smith
    email = fred@nowhere.com

* You may prefer to edit the Slycat sources using the tools located on your
`host` system, instead of the tools provided inside the container.  One way to do this would be to use `sshfs` to
mount the source code inside the container to a directory on the host::

  $ mkdir ~/src/slycat-container
  $ sshfs -p 2222 slycat@192.168.59.103:/home/slycat/src/slycat ~/src/slycat-container -oauto_cache,reconnect,defer_permissions,negative_vncache,volname=Slycat

Regardless of how you edit the sources, the Slycat server will restart automatically whenever you make modifications.

