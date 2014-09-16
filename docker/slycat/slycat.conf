#!/bin/bash

# Start the ssh server.
/usr/sbin/sshd

# Start the couchdb server.
/usr/bin/couchdb -a /etc/couchdb/default.ini -a /etc/couchdb/local.ini -b -r 5 -p /var/run/couchdb/couchdb.pid
sleep 5

# Setup the Slycat couchdb schema and start the Slycat web server.
cd /home/slycat/src/slycat/web-server
python slycat-couchdb-setup.py
PYTHONPATH=/home/slycat/src/slycat/packages python slycat-web-server.py
