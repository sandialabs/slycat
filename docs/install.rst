.. _Install Slycat:

Install Slycat
=================

As a convenience, we provide a `Docker <http://www.docker.com>`_ image that
has Slycat and all its dependencies preinstalled. Using the Slycat image,
you can quickly begin exploring Slycat, try some tutorials, and run small
analyses on your own data. Eventually you might want to :ref:`Setup Slycat Web
Server` on your own hardware to perform large-scale analyses.

Install Docker
--------------

Mac OSX Installation
~~~~~~~~~~~~~~~~~~~~

Because Docker uses Linux-specific kernel features, you will need to run Docker
in a virtual machine (VM) on your Mac.  Fortunately, Docker makes this relatively easy:

* Download the latest `Boot2Docker` installer from https://github.com/boot2docker/osx-installer/releases
* Run the installer.  This will install a set of docker commands, plus a `VirtualBox <https://www.virtualbox.org>`_ hypervisor, if you don't already have one.
* In a terminal window, initialize the Boot2Docker VM:

  $ boot2docker init

* Next, start the Boot2Docker VM::

  $ boot2docker start

* Once the Boot2Docker VM begins running, a message on the console instructs you to set the DOCKER_HOST environment variable.  Copy and paste the command into the terminal (note that the variable setting on your machine may differ from the following example)::

  $ export DOCKER_HOST=tcp://192.168.59.103:2375

With Boot2Docker installed and running and the DOCKER_HOST environment variable set, the rest of the
install instructions are platform-independent.

.. NOTE::

  If you're using Boot2Docker behind a proxy, you'll need additional configuration
  so it can access the network to download the Slycat image:

  * To configure proxy information, ssh into the Boot2Docker VM::

    $ boot2docker ssh

  * Create / modify the `/var/lib/boot2docker/profile` file to set proxy info::

    $ sudo vi /var/lib/boot2docker/profile

  * Add the proxy info using `protocol://host:port`, for example:
    ::

      export HTTP_PROXY=http://your.proxy.name:80
      export HTTPS_PROXY=http://your.proxy.name:80

  * If your site uses SSL interception, you will need to get a copy of the
    interception certificate, and append it to /etc/ssl/cacerts.pem::

    $ sudo vi /etc/ssl/cacert.pem

  * Restart the Docker service and exit the VM::

    $ sudo /etc/init.d/docker restart
    $ exit

Other Platforms
~~~~~~~~~~~~~~~

You will need to install the Docker engine on your host, following the instructions
at https://docs.docker.com/installation/#installation

Download the Image and Create a Container
-----------------------------------------

Now that you have the Docker daemon running and DOCKER_HOST set to connect to it,
you're ready to download the Slycat image and create a container::

  $ docker run -d -p 2222:22 -p 443:443 --name slycat sandialabs/slycat

Docker will begin downloading the `sandialabs/slycat` image, and will create a
container with the name `slycat` (you will use this name as a convenient way to
reference the container in subsequent commands).  The Slycat server will begin
running as soon as the download is complete.  Leave the container running for
the remainder of these tutorials.

Connect to Slycat with a Web Browser
------------------------------------

* If you're running the Slycat container on a Linux host, you can open a web browser and point it to the Slycat server directly at https://localhost.

* If you're running the Slycat container in a VM on a non-Linux host, you need to know the IP address of the VM::

    $ boot2docker ip
     
    The VM's Host only interface IP address is: 192.168.59.103

Open a web browser and point it to the Slycat server at https://192.168.59.103
... note that the IP address may be different on your machine, and that the `https://`
is *required*.

* When prompted for a username and password, enter *slycat* for both.

* The Slycat Projects page opens in the browser.

Next Steps
----------

-  That's it! Now that you're up-and-running, it's time to :ref:`Create a CCA Model`.

