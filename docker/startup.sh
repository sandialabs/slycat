#!/bin/bash

/usr/bin/couchdb -a /etc/couchdb/default.ini -a /etc/couchdb/local.ini -b -r 5 -p /var/run/couchdb/couchdb.pid
sleep 5

cd /slycat/web-server
python slycat-couchdb-setup.py
PYTHONPATH=/slycat/packages python slycat-web-server.py
