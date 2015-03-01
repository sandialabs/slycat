FROM sandialabs/sshd
MAINTAINER Timothy M. Shead <tshead@sandia.gov>

# Install yum packages.
RUN yum install -y --nogpgcheck http://download1.rpmfusion.org/free/fedora/rpmfusion-free-release-$(rpm -E %fedora).noarch.rpm http://download1.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-$(rpm -E %fedora).noarch.rpm
RUN yum install -y couchdb dejavu-serif-fonts "ffmpeg >= 1.1" gcc git "haproxy > 1.5" h5py numpy pyOpenSSL pystache "python >= 2.7" python-couchdb python-devel python-dill python-ldap python-paramiko python-pillow python-pip python-requests python-routes python-scikit-image python-zmq scipy

# Install Python modules.
RUN pip install cherrypy==3.2.6 ipython tornado-couchdb

# Assign a password to root.
RUN echo 'root:slycat' | chpasswd

# Create a slycat user.
RUN /usr/sbin/useradd --create-home --home-dir /home/slycat --shell /bin/bash -G wheel slycat
# Assign a password to the slycat user.
RUN echo 'slycat:slycat' | chpasswd
# The following commands are run as user "slycat".
USER slycat
# Add the Slycat packages to the PYTHONPATH environment variable so our executables can find them.
RUN echo "export PYTHONPATH=/home/slycat/src/slycat/packages" >> /home/slycat/.bash_profile
# Add our home-grown CA certificate to the environment where push scripts can find it.
RUN echo "export REQUESTS_CA_BUNDLE=/home/slycat/src/slycat/docker/slycat/root-ca.pem" >> /home/slycat/.bash_profile
# Clone the Slycat git repository and switch to a known-good commit.
RUN mkdir /home/slycat/src; cd /home/slycat/src; git clone https://github.com/sandialabs/slycat.git; cd slycat; git checkout 8fda93001c32d8ebfcdb0655411e66d1713bbb57

# The following commands are run as root.
USER root

# We want CouchDB to listen on all network interfaces.
RUN sed -e 's/^bind_address = .*$/bind_address = 0.0.0.0/' -i /etc/couchdb/default.ini
# Run the Slycat CouchDB setup script, which sets-up a "slycat" database and configures its schema.
ADD couchdb-setup.ini /tmp/couchdb-setup.ini
RUN /usr/bin/couchdb -a /etc/couchdb/default.ini -a /etc/couchdb/local.ini -a /tmp/couchdb-setup.ini -b -r 5; sleep 5; cd /home/slycat/src/slycat/web-server; /usr/bin/python slycat-couchdb-setup.py
# Configure supervisord to run CouchDB at startup.
ADD couchdb-server-startup.conf /etc/supervisord.d/couchdb-server-startup.conf
# CouchDB will be listening on port 5984.
EXPOSE 5984

# Create a directory to contain Slycat configuration.
RUN mkdir -p /etc/slycat
ADD web-server-config.ini /etc/slycat/web-server-config.ini
ADD proxy-server-config.conf /etc/slycat/proxy-server-config.conf
ADD ssl.pem /etc/slycat/ssl.pem
# Create a directory to contain HDF5 files stored by Slycat.
RUN mkdir -p /var/lib/slycat/data-store
RUN chown --recursive slycat:slycat /var/lib/slycat
# Create a directory to contain the Slycat logfiles.
RUN mkdir -p /var/log/slycat
RUN chown slycat:slycat /var/log/slycat
# Configure supervisord to run the Slycat web server at startup.
ADD web-server-startup.conf /etc/supervisord.d/web-server-startup.conf
# Configure supervisord to run the Slycat feed server at startup.
ADD feed-server-startup.conf /etc/supervisord.d/feed-server-startup.conf
# Configure supervisord to run the Slycat reverse proxy at startup.
ADD proxy-server-startup.conf /etc/supervisord.d/proxy-server-startup.conf
# The reverse proxy will be listening on ports 80 and 443.
EXPOSE 80
EXPOSE 443

# We don't specify a startup command, since the base image already starts
# supervisord for us.
