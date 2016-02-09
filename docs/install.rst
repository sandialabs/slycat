.. _install-slycat:

Install Slycat
=================

As a convenience, we provide a `Docker <http://www.docker.com>`_ image that has
Slycat and all its dependencies preinstalled. Using the Slycat image, you can
quickly begin exploring Slycat, try some tutorials, and run small analyses on
your own data. Eventually you might want to :ref:`setup-slycat-web-server` on
your own hardware to perform large-scale analyses.

Install Docker
--------------

Installation
~~~~~~~~~~~~~~~~~~~~

Because Docker uses Linux-specific kernel features, you will need to run Docker
in a virtual machine (VM) on your Mac or Windows environment. Fortunately, Docker makes this relatively easy:

* Download the latest `docker` for your specific environment from https://www.docker.com/
* follow the instruction for installing docker on your machine

With docker installed and running and the DOCKER_* environment variables set, the rest of the
install instructions are platform-independent.

.. NOTE::

  If you're using `Docker <http://www.docker.com>`_ behind a proxy, you'll need additional configuration
  so it can access the network to download the Slycat image:

  * To configure proxy information, ssh into the Boot2Docker VM::

    $ docker-machine ssh default

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
    images.


Download the Image and Create a Container
-----------------------------------------

Now that you have the Docker daemon running and DOCKER_HOST set to connect to it,
you're ready to download the Slycat image and create a container::

  $ docker run -d -p 2222:22 -p 80:80 -p 443:443 --name slycat sandialabs/slycat-developer

Docker will begin downloading the `sandialabs/slycat` image, and will create a
container with the name `slycat` (you will use this name as a convenient way to
reference the container in subsequent commands).  The Slycat server will begin
running as soon as the download is complete.  Leave the container running for
the remainder of these tutorials.

.. WARNING::

  A new image is currently being created so the image has to currently be built from scratch via
  build.py in the slycat github repi /open-source-docker/docker/open-source-build/build.py

Connect to Slycat with a Web Browser
------------------------------------

Open a web browser and point it to the Slycat server at https://<docker host ip>

* If you're running the Slycat container on a Linux host, this will be `https://localhost`.

* If you're running the Slycat container using boot2docker on another platform, this will be the IP address returned by::

    $ docker-machine ip
     
    The VM's Host only interface IP address is: 192.168.99.100

* The browser will complain that the server certificate is untrusted.  This is because we use a self-signed certificate for the Docker container.  Follow your browser's procedures to temporarily trust the connection.

* When prompted for a username and password, enter *slycat* for both.

* The Slycat Projects page opens in the browser.

Next Steps
----------

-  That's it! Now that you're up-and-running, it's time to :ref:`create-cca-model`.

