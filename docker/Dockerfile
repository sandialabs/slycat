FROM fedora:20
MAINTAINER Timothy M. Shead <tshead@sandia.gov>

RUN yum install -y couchdb git python-devel python-pip numpy scipy python-couchdb python-paramiko python-routes pyOpenSSL python-requests python-ldap python-nose python-coverage python-sphinx python-pillow python-sphinx_rtd_theme h5py pystache

RUN pip install cherrypy==3.2.6 sphinxcontrib-napoleon

RUN git clone https://github.com/sandialabs/slycat.git

RUN sed -e 's/^bind_address = .*$/bind_address = 0.0.0.0/' -i /etc/couchdb/default.ini
#RUN /usr/bin/couchdb -a /etc/couchdb/default.ini -a /etc/couchdb/local.ini -b -p /var/run/couchdb/couchdb.pid; sleep 5; cd /slycat/web-server; python slycat-couchdb-setup.py; /usr/bin/couchdb -d

EXPOSE 5984
EXPOSE 8092
ADD startup.sh /startup.sh
CMD /bin/bash /startup.sh

