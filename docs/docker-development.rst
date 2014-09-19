.. _Docker Development:

Docker Development
==================

One of the easiest ways to begin making changes or additions to Slycat is using
our Docker image to quickly setup a development environment.  Here are some
guidelines to get you started:

Prerequisites
-------------

* We assume that you've already :ref:`Installed Slycat <Install Slycat>` and the Slycat container is running.
* You will need to note the IP address of the Docker host:

  * If you are running Docker on a Linux host, then the host IP is "localhost" or "127.0.0.1"
  * If you are running Boot2Docker on a non-Linux host, then the host IP is the address reported by the `boot2docker ip` command.
  * We will refer to the host address as `host_ip` throughout the rest of this document.

Working Inside the Running Container
------------------------------------

* The Slycat container includes an ssh server, so you can login to the container as user `slycat` with password `slycat`::

  $ ssh slycat@HOST_IP -p2222

* Once you're logged-in, you can pull the latest version of the source code::

  $ cd src/slycat
  $ git pull

* And you can edit the source code in-place::

  $ vi packages/slycat/...

* You can see the logging output from the Slycat server::

  $ tail -f /var/log/slycat/*

* And the couchdb database if necessary::

  $ tail -f /var/log/couchdb/*

* Note that when you make source code changes, the Slycat server automatically
  restarts.  However, if you insert a typo or other syntax error, the server won't
  be able to restart.  For this reason, it's usually better to kill the Slycat server
  that automatically runs when the container is started, and run your own server
  instead::

    $ ps aux # To list processes running within the container
    $ kill <Slycat PID>
    $ cd src/slycat/web-server
    $ python slycat-web-server.py

  Then use another ssh login for code editing.

* To commit changes while logged-in to the container, you'll need to add your
  personal information to `~/.gitconfig`::

    [user]
      name = Fred P. Smith
      email = fred@nowhere.com

* By default, the Slycat repository in the container is configured for read-only
  access to the public https://github.com/sandialabs/slycat repository.  You will
  need to change it in order to push changes back to the repo.  There are two
  alternatives:

  * Add your username to the https:// address.  Then, you will be prompted for your
    github password whenever you push changes::

      $ git remote set-url origin https://username@github.com/sandialabs/slycat

    If you are working behind a proxy, you'll also need to let git know about it::

      $ export https_proxy=http://your.proxy.name:80

  * Copy an existing github public key into the container, or generate a new github
    public key, and switch to communication over ssh::

    $ git remote set-url origin git@github.com:sandialabs/slycat

Working Outside the Running Container
-------------------------------------

Instead of working on the Slycat source inside the running container, you may
wish to edit them from the outside.  One advantage of this approach is that you
can edit the sources using more sophisticated graphical editors that installed
on your host system, instead of the tools provided within the container.  Another
is that the setup you perform (configuring your git credentials, setting-up
proxy information) is part of your host system and will be retained even if you
upgrade or replace the Slycat container.

One way to do this is to use `sshfs` to mount the source code inside the
container to a directory on the host::

  $ mkdir ~/src/slycat-container
  $ sshfs -p 2222 slycat@host_ip:/home/slycat/src/slycat ~/src/slycat-container -oauto_cache,reconnect,defer_permissions,negative_vncache,volname=slycat-container

Regardless of how you edit the sources, the Slycat server will still restart
automatically whenever you make modifications, and you will likely want to
run the server in an ssh session so you can see its logging output and restart
it if necessary.

