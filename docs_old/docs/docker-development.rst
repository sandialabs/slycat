.. _docker-development:

Docker Development
==================

One of the easiest ways to begin making changes or additions to Slycat is using
our Docker image to quickly setup a development environment.  Here are some
guidelines to get you started:

Prerequisites
-------------

* We assume that you've already :ref:`Installed Slycat <install-slycat>` and
  are familiar with how to manage the Slycat docker image.
* We provide a special developer's image that modifies the Slycat Docker image
  that you've been working with for easier development, so download and run it now::

    $ docker run -p 2222:22 -p 80:80 -p 443:443 -p 5984:5984 -p 9001:9001 -d --name slycat-dev sandialabs/slycat-dev

* You will need to note the IP address of the Docker host:

  * If you are running Docker on a Linux host, then the Docker host IP is "localhost" or "127.0.0.1"
  * If you are running Boot2Docker on a non-Linux host, then the Docker host IP is the address reported by the `boot2docker ip` command.
  * We will refer to the host address as `<docker host ip>` throughout the rest of this document.

Working Inside the Running Container
------------------------------------

* The Slycat container includes an ssh server, so you can login to the container as user `slycat` with password `slycat`::

  $ ssh slycat@<docker host ip> -p2222

* Once you're logged-in, you can pull the latest version of the source code (note that when we build the Docker container, we checkout a specific, known-good commit, so you have to switch to a branch before you pull)::

    $ cd src/slycat
    $ git checkout master
    $ git pull

* And you can edit the source code in-place::

  $ vi packages/slycat/...

* The Slycat software stack includes four running servers: the couchdb database, the Slycat web server, the
  Slycat feed server, and an haproxy reverse proxy server.  All four servers are automatically started
  by `supervisord` when you start the slycat-dev container.  To check on their status, use the `supervisorctl`
  command::

    $ supervisorctl status
    couchdb                          RUNNING    pid 10, uptime 0:02:14
    feed-server                      RUNNING    pid 11, uptime 0:02:14
    proxy-server                     RUNNING    pid 13, uptime 0:02:14
    sshd                             RUNNING    pid 9, uptime 0:02:14
    web-server                       RUNNING    pid 12, uptime 0:02:14

  However, development is often much easier when you run one or more of the
  servers yourself - you can configure the server to restart automatically in
  response to code or configuration changes, see the server output in the
  console, and know immediately if a typo or syntax error causes the server to
  fail.

  You cannot simply kill a server process started by `supervisord`, because it
  will be automatically restarted.  Use `supervisorctl` to stop it, then start
  your own copy for development:

  **Running Your Own Web Server**::

    $ supervisorctl stop web-server
    web-server: stopped
    $ cd src/slycat/web-server
    $ python slycat-web-server.py

  **Running Your Own Feed Server**::

    $ supervisorctl stop feed-server
    feed-server: stopped
    $ cd src/slycat/feed-server
    $ python slycat-feed-server.py

  **Running Your Own Reverse Proxy**::

    $ supervisorctl stop proxy-server
    proxy-server: stopped
    $ cd src/slycat/proxy-server
    $ sudo haproxy -f configuration.conf -d

  Typically, you would then use a separate ssh login for making code changes.

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
    github password when you push::

      $ git remote set-url origin https://username@github.com/sandialabs/slycat

  * Copy an existing github public key into the container, or generate a new github
    public key, and switch to communication over ssh::

    $ git remote set-url origin git@github.com:sandialabs/slycat

.. NOTE::

  If you're working behind a proxy and using https:// for communication with github, you'll need to let git know about it::

    $ export https_proxy=http://your.proxy.name:80

* If you need to install additional tools for development, use the `yum` and
  `pip` commands provided by the container to install them.


.. NOTE::

  If you're working behind a proxy, you'll also want to add it to /etc/yum.conf to yum can download packages::

    proxy=http://your.proxy.name:80

  And you'll need to specify the proxy when running pip::

    pip install --proxy=http://your.proxy.name:80 mypackage

Working Outside the Running Container
-------------------------------------

Instead of working on the Slycat sources inside the running container, you may
wish to edit them from the outside.  One advantage of this approach is that you
can edit the sources using more sophisticated graphical tools installed
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

