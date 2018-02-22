#!/bin/sh
#
#

service sshd start
sleep 2
service rsyslog start
service couchdb start
sleep 2
/home/slycat/install/conda/bin/python /home/slycat/src/slycat/web-server/slycat-couchdb-setup.py
sleep 2
service haproxy start
service slycat-web-server start



while [ 0 ]
do
  sleep 4

  if ! pgrep -x "sshd" > /dev/null
  then
 	service rsyslog start
	service couchdb start
	sleep 1
	/home/slycat/install/conda/bin/python /home/slycat/src/slycat/web-server/slycat-couchdb-setup.py
	service slycat-web-server start
	service haproxy start
	service sshd start		
  fi

  service slycat-web-server status
  retval=$?
  [ $retval -ne 0 ] && service slycat-web-server cleanup

done