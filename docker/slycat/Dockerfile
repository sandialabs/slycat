FROM sandialabs/sshd
MAINTAINER Timothy M. Shead <tshead@sandia.gov>

# Install yum packages.
RUN yum install -y couchdb dejavu-serif-fonts git h5py numpy pyOpenSSL pystache python-couchdb python-devel python-ldap python-paramiko python-pillow python-pip python-requests python-routes python-zmq scipy

# Install Python modules.
RUN pip install cherrypy==3.2.6 ipython

# Setup the root user.
RUN echo 'root:slycat' | chpasswd

# Setup the Slycat user.
RUN /usr/sbin/useradd --create-home --home-dir /home/slycat --shell /bin/bash -G wheel slycat
RUN echo 'slycat:slycat' | chpasswd
USER slycat
RUN echo "export PYTHONPATH=/home/slycat/src/slycat/packages" >> /home/slycat/.bash_profile
RUN echo "export REQUESTS_CA_BUNDLE=/home/slycat/src/slycat/web-server/root-ca.pem" >> /home/slycat/.bash_profile
RUN mkdir /home/slycat/src; cd /home/slycat/src; git clone https://github.com/sandialabs/slycat.git

USER root

# Setup the couchdb server.
ADD couchdb.conf /etc/supervisord.d/couchdb.conf
RUN sed -e 's/^bind_address = .*$/bind_address = 0.0.0.0/' -i /etc/couchdb/default.ini
ADD couchdb-setup.ini /tmp/couchdb-setup.ini
RUN /usr/bin/couchdb -a /etc/couchdb/default.ini -a /etc/couchdb/local.ini -a /tmp/couchdb-setup.ini -b -r 5; sleep 5; cd /home/slycat/src/slycat/web-server; /usr/bin/python slycat-couchdb-setup.py
EXPOSE 5984

# Setup the Slycat server.
RUN mkdir -p /etc/slycat
RUN mkdir -p /var/lib/slycat/data-store
RUN chown --recursive slycat:slycat /var/lib/slycat
RUN mkdir -p /var/log/slycat
ADD config.ini /etc/slycat/config.ini
ADD web-server.key /etc/slycat/web-server.key
ADD web-server.pem /etc/slycat/web-server.pem
ADD slycat.conf /etc/supervisord.d/slycat.conf
EXPOSE 443

# We don't specify a startup command, since the base image already starts
# supervisord for us.
