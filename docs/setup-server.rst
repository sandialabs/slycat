.. _Setup Slycat Web Server:

Setup Slycat Web Server
=======================

Note: If you're new to Slycat and are here give it a try, please see
:ref:`Install Slycat` instead. The following outlines how we setup the
Slycat Web Server when we build the a custom Slycat virtual machine.
It's intended as a guide for advanced users who are interested in
setting-up Slycat Web Server on their own hardware.  Of course,
you'll have to adjust these instructions for your own OS.

Create the Virtual Machine
--------------------------

-  We used VirtualBox to create a new VM and installed CentOS 6.5 64-bit
   as the OS.
-  The VM should have at least 2 CPUs, and use SCSI instead of SATA as
   the disk controller.

As user root:
-------------

-  Add a "slycat" user.
-  Add the slycat user to group wheel and allow group wheel to use sudo.
-  Setup the EPEL respository:

   ::

       $ wget http://dl.fedoraproject.org/pub/epel/6/i386/epel-release-6-8.noarch.rpm
       $ rpm -ivh epel-release-6-8.noarch.rpm

-  Setup the Chromium repository:

   ::

       $ cd /etc/yum.repos.d
       $ wget http://people.centos.org/hughesjr/chromium/6/chromium-el6.repo

-  Get the latest packages with ``yum upgrade``.
-  Install packaged prerequisites:

   ::

       $ yum install couchdb
       $ yum install git
       $ yum install zlib-devel
       $ yum install bzip2-devel
       $ yum install openssl-devel
       $ yum install ncurses-devel
       $ yum install blas-devel
       $ yum install lapack-devel
       $ yum install openldap-devel
       $ yum install readline-devel
       $ yum install tk-devel
       $ yum install gcc-c++
       $ yum install libpng-devel
       $ yum install chromium
       $ yum install hdf5-devel
       $ yum install libjpeg-turbo-devel

-  Start the CouchDB service and set it up to start automatically at
   boot:

   ::

       $ /etc/init.d/couchdb start
       $ /sbin/chkconfig couchdb on

As user "slycat":
-----------------

-  Build Python 2.7 from source, installing it in -/install/python:

   ::

       $ ./configure --prefix=/home/slycat/install/python --enable-shared
       $ make install

-  Add ``export PATH=-/install/python/bin:$PATH`` to -/.bashrc
-  Add ``export LD_LIBRARY_PATH=-/install/python/lib:$LD_LIBRARY_PATH``
   to -/.bashrc
-  Verify that the above environment takes effect in your shell before
   proceeding.
-  Install Python setuptools:

   ::

       $ wget https://bitbucket.org/pypa/setuptools/downloads/ez_setup.py -O - | python

-  Install pip:

   ::

       $ curl -O https://raw.github.com/pypa/pip/master/contrib/get-pip.py
       $ python get-pip.py

-  Install Python prerequisites:

   ::

       $ pip install cherrypy==3.2.6
       $ pip install couchdb
       $ pip install paramiko
       $ pip install routes
       $ pip install pyopenssl
       $ pip install requests
       $ pip install numpy
       $ pip install scipy
       $ pip install python-ldap
       $ pip install nose
       $ pip install ipython
       $ pip install pystache
       $ pip install h5py
       $ pip install pyzmq
       $ pip install Jinja2
       $ pip install tornado
       $ pip install Pillow

-  Clone the Slycat repo into -/src:

   ::

       $ git clone https://github.com/sandialabs/slycat.git

-  Add ``export PYTHONPATH=-/src/slycat/packages:$PYTHONPATH`` to
   -/.bashrc

-  Configure the couchdb database for use with Slycat:

   ::

       $ cd src/slycat/web-server
       $ python slycat-couchdb-setup.py

-  Import the Slycat root certificate ``slycat/web-server/root-ca.pem``
   into Firefox and Chromium as a trusted authority for identifying
   websites.

-  Add
   ``export REQUESTS_CA_BUNDLE=/home/slycat/src/slycat/web-server/root-ca.pem``
   to -/.bashrc, so push scripts don't have to use the --no-verify
   option.

-  Set the Firefox and Chromium startup pages to https://localhost:8092


