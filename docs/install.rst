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
* In a terminal window, initialize the Boot2Docker VM::

  $ boot2docker init

* Next, start the Boot2Docker VM::

  $ boot2docker start

* Once the Boot2Docker VM begins running, a message on the console instructs you to set several environment variables.  Copy and paste the commands into the terminal (note that your configuration may look different)::

  $ export DOCKER_CERT_PATH=/Users/fred/.boot2docker/certs/boot2docker-vm
  $ export DOCKER_TLS_VERIFY=1
  $ export DOCKER_HOST=tcp://192.168.59.103:2376

With Boot2Docker installed and running and the DOCKER_* environment variables set, the rest of the
install instructions are platform-independent.

Other Platforms
~~~~~~~~~~~~~~~

You will need to install the Docker engine on your host, following the instructions
at https://docs.docker.com/installation/#installation

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

  * Restart the Docker service and exit the Boot2Docker VM::

    $ sudo /etc/init.d/docker restart
    $ exit

.. WARNING::

  * If your site uses SSL interception, you must append the certificate to
    /etc/ssl/cacerts.pem and restart the Docker service before downloading
    images every time you restart boot2docker.  We will provide updated
    information when we have a process to install the certificate permanently.


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

Open a web browser and point it to the Slycat server at https://<docker host ip>

* If you're running the Slycat container on a Linux host, this will be `https://localhost`.

* If you're running the Slycat container using boot2docker on another platform, this will be the IP address returned by::

    $ boot2docker ip
     
    The VM's Host only interface IP address is: 192.168.59.103

Note that the `https://` is *required*.

* When prompted for a username and password, enter *slycat* for both.

* The Slycat Projects page opens in the browser.

Next Steps
----------

-  That's it! Now that you're up-and-running, it's time to :ref:`Create a CCA Model`.

