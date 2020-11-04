###############################
Quick Start with Docker-Compose
###############################

***************************************************************************
Slycat Docker-compose (Alpha release, non production build for development) 
***************************************************************************

Requirements
============

- Download `docker desktop for mac` see https://docs.docker.com/compose/install/
- git
- Currently only tested in a mac environment

Docker service names
====================

- haproxy
- slycat-web-server
- couchdb
- sshd
- slycat-client

Starting slycat services
------------------------

- Clone the repo :code:`$ git clone --depth 1 -b master https://github.com/sandialabs/slycat.git`
- Navigate into the repo to :code:`cd slycat/docker/compose/slycat-compose` in terminal the following commands control our services and use the docker-compose yaml found in the directory in the repo.
- Start the docker services :code:`$ docker-compose up` this step should take some time on the first load to download the images.
- After the :code:`slycat-client_1 | ℹ ｢wdm｣: Compiled successfully.` displays, then everything has finished building and is running waiting for a connection.
- The client is served at https://localhost:9000, NOTE: the browser will show a security warning when navigating to localhost because Slycat generates a self signed certificate.
- admin::password is slycat::slycat

List of helpful docker commands
===============================

Start the services
------------------
.. code-block:: bash

   $ docker-compose up

Stopping slycat services
------------------------
.. code-block:: bash

   $ docker-compose down

Start and build the services
----------------------------
.. code-block:: bash

   $ docker-compose up --build

Stopping and removing slycat services
-------------------------------------
.. code-block:: bash

   $ docker-compose down --remove-orphans 

Starting slycat services in the background
------------------------------------------
.. code-block:: bash

   $ docker-compose up -d

Attaching to slycat services logs per service
---------------------------------------------
.. code-block:: bash

   $ docker-compose logs -f <name_of_service>

Building the images separate without using the cache
----------------------------------------------------
.. code-block:: bash

   $ docker-compose build --no-cache

Building the images and starting from cached images
---------------------------------------------------
.. code-block:: bash

   $ docker-compose up --build
