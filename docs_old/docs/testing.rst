.. _testing:

Testing
=======

The following are required to run the Slycat test suite / view test coverage:

* behave - behavior-driven development (BDD) framework - http://pythonhosted.org/behave/
* coverage - code coverage module - http://nedbatchelder.com/code/coverage/

Setting Up Tests
----------------

The following set of instructions for the test setup assumes a new Ubuntu environment (desktop or server) with user `slycat`.
It also assumes that Slycat's repository is cloned in the user's home directory.
The next commands install the base packages needed for the test suite to run correctly::

  $ cd
  $ sudo apt-get update -qq
  $ sudo apt-get install -y make build-essential python-software-properties ssh python-dev libldap2-dev libsasl2-dev libssl-dev

Slycat uses CouchDB as its database. Use the default installation settings for the database setup. See http://wiki.apache.org/couchdb/Installing_on_Ubuntu for troubleshooting::

  $ sudo apt-get install -y couchdb

To install haproxy-1.5. Note that the Ubuntu 12.04's version is out-of-date::

  $ sudo add-apt-repository -y ppa:vbernat/haproxy-1.5
  $ sudo apt-get update -qq
  $ sudo apt-get install haproxy

To install the virtual X server and Firefox::

  $ sudo apt-get install xvfb firefox

To install FFmpeg for the agent testing::

  $ wget http://johnvansickle.com/ffmpeg/releases/ffmpeg-release-64bit-static.tar.xz
  $ mkdir ffmpeg
  $ tar xf ffmpeg-release-64bit-static.tar.xz --strip-components 1 -C ffmpeg
  $ export PATH=$HOME/ffmpeg:$PATH

To point Python to the Slycat packages::

  $ export PYTHONPATH=$HOME/slycat/packages

To generate a private certificate authority::

  $ openssl genrsa -out root-ca.key 2048
  $ openssl req -x509 -new -nodes -key root-ca.key -days 365 -out root-ca.cert -subj "/C=US/ST=New Mexico/L=Albuquerque/O=The Slycat Project/OU=QA/CN=Slycat"

To generate a self-signed certificate::

  $ openssl genrsa -out web-server.key 2048
  $ openssl req -new -key web-server.key -out web-server.csr -subj "/C=US/ST=New Mexico/L=Albuquerque/O=The Slycat Project/OU=QA/CN=localhost"
  $ openssl x509 -req -in web-server.csr -CA root-ca.cert -CAkey root-ca.key -CAcreateserial -out web-server.cert -days 365

To point HAProxy to the server key and certificate::

  $ cat web-server.key web-server.cert > ssl.pem

To create a directory to store HDF5 files::

  $ mkdir slycat/data-store

To install and use Conda for the Python interpreter and dependencies::

  $ wget http://repo.continuum.io/miniconda/Miniconda-latest-Linux-x86_64.sh -O miniconda.sh
  $ chmod +x miniconda.sh
  $ ./miniconda.sh -b
  $ export PATH=$HOME/miniconda/bin:$PATH
  $ conda update --yes conda
  $ conda create --yes -n slycat coverage h5py mock nose paramiko Pillow pip pyparsing requests scipy
  $ source activate slycat
  $ pip install --no-use-wheel behave "cherrypy==3.2.6" couchdb coveralls python-ldap pystache routes tornado-couchdb selenium pyvirtualdisplay

Running Tests
-------------

Create a file `proxy-server-config.conf` in the `/home/slycat` directory with the following content::

  global
    daemon
    maxconn 256
    user slycat
    group slycat
    tune.ssl.default-dh-param 2048

  defaults
    mode http
    option forwardfor
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms
    timeout tunnel 1d

  frontend http-in
    bind *:80
    redirect scheme https if !{ ssl_fc }

  frontend https-in
    bind *:443 ssl crt /home/slycat/ssl.pem
    reqadd X-Forwarded-Proto:\ https
    redirect location /projects if { path / }
    use_backend slycat-feed-server if { path_beg /changes-feed }
    default_backend slycat-web-server

  backend slycat-web-server
    server server1 127.0.0.1:8092

  backend slycat-feed-server
    server server1 127.0.0.1:8093

To run the test suite, enter the following commands::

  $ python slycat/web-server/slycat-couchdb-setup.py
  $ sudo haproxy -f proxy-server-config.conf -db &
  $ python slycat/feed-server/slycat-feed-server.py --config ../travis-ci/config.ini &
  $ python slycat/web-server/slycat-web-server.py --config ../travis-ci/config.ini &
  $ cd slycat
  $ REQUESTS_CA_BUNDLE=/home/slycat/root-ca.cert coverage run --source agent,packages/slycat --omit="packages/slycat/web/server/*" -m behave -i "(agent|hyperchunks|rest-api|slycat-web-server|slycat-project)"

Running Coverage
----------------

To run the coverage report::

  $ coverage report

Modifying Tests
---------------

Behave feature and step definition files are located in the `slycat/features` and `slycat/features/steps` directories, respectively.
