.. _Docker Development:

Docker Development
==================

One of the easiest ways to begin making changes or additions to Slycat is using
our Docker image to quickly setup a development environment.  Here are some
guidelines to get you started:

Prerequisites
-------------

* We assume that you've already :ref:`Installed Slycat <Install Slycat>` and
  are familiar with how to manage the Slycat docker image.
* We provide a special developer's image that modifies the Slycat Docker image
  that you've been working with for easier development, so download and run it now::

    $ docker run -p 2222:22 -p 5984:5984 -p 443:8092 -d --name slycat-dev sandialabs/slycat-dev

* You will need to note the IP address of the Docker host:

  * If you are running Docker on a Linux host, then the Docker host IP is "localhost" or "127.0.0.1"
  * If you are running Boot2Docker on a non-Linux host, then the Docker host IP is the address reported by the `boot2docker ip` command.
  * We will refer to the host address as `<docker host ip>` throughout the rest of this document.

Working Inside the Running Container
------------------------------------

* The Slycat container includes an ssh server, so you can login to the container as user `slycat` with password `slycat`::

  $ ssh slycat@<docker host ip> -p2222

* Once you're logged-in, you can pull the latest version of the source code::

  $ cd src/slycat
  $ git pull

* And you can edit the source code in-place::

  $ vi packages/slycat/...

* Note that the Slycat server isn't running by default when you start the slycat-dev container.
  That's because when you make source code changes, the Slycat server automatically
  restarts.  However, if you insert a typo or other syntax error, the server won't
  be able to restart.  Thus, it's better when coding to just run your own Slycat server
  instead, so you can see when it's died, and restart it more easily::

    $ cd src/slycat/web-server
    $ python slycat-web-server.py

  Then use another ssh login for code editing.

* When you run the Slycat server from the source directory, the default configuration logs
  everything to stderr / stdout, so you won't need to watch any Slycat logs.  However, you
  can still watch the couchdb logs if necessary::

  $ tail -f /var/log/couchdb/*

* To commit changes while logged-in to the container, you'll need to add your
  personal information to `~/.gitconfig`::

    [user]
      name = Fred P. Smith
      email = fred@nowhere.com

* By default, the git repository in the container is configured to access
  the public Slycat repository using https://github.com/sandialabs/slycat repository.
  If you want to push your commits to the public repository, there are three alternatives:

  * Leave the repository URL unchanged, and push.  You will be prompted for your github
    username and password.
    
  * Add your username to the repository URL.  Then, you will only be prompted for your
    github password whenr you push::

      $ git remote set-url origin https://username@github.com/sandialabs/slycat

  * Copy an existing github public key into the container, or generate a new github
    public key, and switch to communication over ssh::

    $ git remote set-url origin git@github.com:sandialabs/slycat

.. NOTE::

  If you're working behind a proxy with an https:// URL, you'll need to let git know about it::
  
    $ export https_proxy=http://your.proxy.name:80
  

Working Outside the Running Container
-------------------------------------

Instead of working on the Slycat sources inside the running container, you may
wish to edit them from the outside.  One advantage of this approach is that you
can edit the sources using sophisticated graphical tools installed
on your host system, instead of the minimalist command-line tools provided within
the container.  Another benefit is that the setup you perform (configuring your git
credentials, setting-up proxy information) is part of your host system and will be
retained even if you upgrade or replace the Slycat container.

One way to do this is to use `sshfs` to mount the source code inside the
container to a directory on the host::

  $ mkdir ~/src/slycat-container
  $ sshfs -p 2222 slycat@<docker host ip>:/home/slycat/src/slycat ~/src/slycat-container -oauto_cache,reconnect,defer_permissions,negative_vncache,volname=slycat-container

The main disadvantage to working this way is the increased latency caused by the sshfs
filesystem ... some operations (such as building the documentation) will be noticably
slower when run on an sshfs mount

Note that you'll still need to ssh into the container to run the Slycat server, but the server
will still restart automatically whenever you save changes to the sshfs mount.

