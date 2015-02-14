FROM sandialabs/sshd
MAINTAINER Timothy M. Shead <tshead@sandia.gov>

# Install yum packages.
RUN yum install -y --nogpgcheck http://download1.rpmfusion.org/free/fedora/rpmfusion-free-release-$(rpm -E %fedora).noarch.rpm http://download1.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-$(rpm -E %fedora).noarch.rpm
RUN yum install -y couchdb dejavu-serif-fonts ffmpeg gcc git haproxy h5py numpy pyOpenSSL pystache python-couchdb python-devel python-dill python-ldap python-paramiko python-pillow python-pip python-requests python-routes python-scikit-image python-zmq scipy

# Install Python modules.
RUN pip install cherrypy==3.2.6 ipython tornado-couchdb

# Setup the root user.
RUN echo 'root:slycat' | chpasswd

# Setup the Slycat user.
RUN /usr/sbin/useradd --create-home --home-dir /home/slycat --shell /bin/bash -G wheel slycat
RUN echo 'slycat:slycat' | chpasswd
USER slycat
RUN echo "export PYTHONPATH=/home/slycat/src/slycat/packages" >> /home/slycat/.bash_profile
RUN echo "export REQUESTS_CA_BUNDLE=/home/slycat/src/slycat/docker/slycat/root-ca.pem" >> /home/slycat/.bash_profile
RUN mkdir /home/slycat/src; cd /home/slycat/src; git clone https://github.com/sandialabs/slycat.git; cd slycat; git checkout d7b96f2147770e57c9603397a8540039a1b16672

USER root

# Setup the couchdb server.
ADD couchdb-server-startup.conf /etc/supervisord.d/couchdb-server-startup.conf
RUN sed -e 's/^bind_address = .*$/bind_address = 0.0.0.0/' -i /etc/couchdb/default.ini
ADD couchdb-setup.ini /tmp/couchdb-setup.ini
RUN /usr/bin/couchdb -a /etc/couchdb/default.ini -a /etc/couchdb/local.ini -a /tmp/couchdb-setup.ini -b -r 5; sleep 5; cd /home/slycat/src/slycat/web-server; /usr/bin/python slycat-couchdb-setup.py
EXPOSE 5984

# Setup the Slycat servers.
RUN mkdir -p /etc/slycat
RUN mkdir -p /var/lib/slycat/data-store
RUN chown --recursive slycat:slycat /var/lib/slycat
RUN mkdir -p /var/log/slycat
ADD web-server-config.ini /etc/slycat/web-server-config.ini
ADD proxy-server-config.conf /etc/slycat/proxy-server-config.conf
ADD ssl.pem /etc/slycat/ssl.pem
ADD web-server-startup.conf /etc/supervisord.d/web-server-startup.conf
ADD feed-server-startup.conf /etc/supervisord.d/feed-server-startup.conf
ADD proxy-server-startup.conf /etc/supervisord.d/proxy-server-startup.conf
EXPOSE 80
EXPOSE 443

# We don't specify a startup command, since the base image already starts
# supervisord for us.
