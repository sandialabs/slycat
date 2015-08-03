FROM fedora:20
MAINTAINER Timothy M. Shead <tshead@sandia.gov>

# Install yum packages.
RUN yum install -y --nogpgcheck http://download1.rpmfusion.org/free/fedora/rpmfusion-free-release-$(rpm -E %fedora).noarch.rpm http://download1.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-$(rpm -E %fedora).noarch.rpm
RUN yum install -y supervisor couchdb dejavu-serif-fonts "ffmpeg >= 1.1" gcc git "haproxy > 1.5" h5py numpy pyOpenSSL pystache "python >= 2.7" python-couchdb python-devel python-dill python-ldap python-paramiko python-pillow python-pip python-requests python-routes python-scikit-image python-zmq scipy

# Install Python modules.
RUN pip install cherrypy==3.2.6 ipython pyparsing>=2.0.3 tornado-couchdb

# Create a slycat user.
RUN /usr/sbin/useradd --create-home --home-dir /home/slycat --shell /bin/bash slycat
# The following commands are run as user "slycat".
USER slycat
# Add the Slycat packages to the PYTHONPATH environment variable so our executables can find them.
RUN echo "export PYTHONPATH=/home/slycat/src/slycat/packages" >> /home/slycat/.bashrc
# Clone the Slycat git repository and switch to a known-good commit.
RUN mkdir /home/slycat/src; cd /home/slycat/src; git clone https://github.com/sandialabs/slycat.git

# The following commands are run as root.
USER root

# Configure supervisord
ADD supervisord.conf /etc/supervisord.conf
RUN mkdir -p /var/lib/supervisor
# Configure supervisord to run CouchDB at startup.
ADD couchdb-server-startup.conf /etc/supervisord.d/couchdb-server-startup.conf
# Configure supervisord to run slycat-couchdb-setup.py at start
ADD couchdb-setup-startup.conf /etc/supervisord.d/couchdb-setup-startup.conf
# Create a directory to contain Slycat configuration.
RUN mkdir -p /etc/slycat
ADD proxy-server-config.conf /etc/slycat/proxy-server-config.conf
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


# Assign a password to root.
RUN echo 'root:slycat' | chpasswd
# Assign a password to the slycat user.
RUN echo 'slycat:slycat' | chpasswd

# Generate a private certificate authority.
RUN yum install -y openssl
RUN openssl genrsa -out /root-ca.key 2048
RUN openssl req -x509 -new -nodes -key /root-ca.key -days 365 -out /root-ca.cert -subj "/C=US/ST=New Mexico/L=Albuquerque/O=The Slycat Project/OU=QA/CN=Slycat"
# Generate a self-signed certificate.
RUN openssl genrsa -out /web-server.key 2048
RUN openssl req -new -key /web-server.key -out /web-server.csr -subj "/C=US/ST=New Mexico/L=Albuquerque/O=The Slycat Project/OU=QA/CN=localhost"
RUN openssl x509 -req -in /web-server.csr -CA /root-ca.cert -CAkey /root-ca.key -CAcreateserial -out /web-server.cert -days 365
# Put the server key and certificate where the reverse proxy can find them.
RUN cat /web-server.key /web-server.cert > /etc/slycat/ssl.pem
# Add our private CA to the system-wide list of certificate authorities, so push scripts will trust the web-server.
RUN cp /root-ca.cert /etc/pki/ca-trust/source/anchors/
RUN /usr/bin/update-ca-trust

# Setup the sshd service.
RUN yum install -y openssh-server
RUN mkdir /var/run/sshd
RUN mkdir /var/log/sshd
RUN ssh-keygen -t rsa -f /etc/ssh/ssh_host_rsa_key -N ''
# Configure supervisord to run ssh at startup.
ADD sshd-server-startup.conf /etc/supervisord.d/sshd-server-startup.conf
# sshd will be listening on port 22.
EXPOSE 22

# Supply a configuration for the web and feed servers
ADD config.ini /etc/slycat/config.ini

# Checkout the desired git revisions.
USER slycat
RUN cd /home/slycat/src/slycat; git pull; git checkout a47311dff686f257380f95f424db97e932f0f62b
USER root

# Default startup command.
CMD ["supervisord", "-c", "/etc/supervisord.conf"]

