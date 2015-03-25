FROM sandialabs/slycat-base
MAINTAINER Timothy M. Shead <tshead@sandia.gov>

# Setup the sshd service.
RUN yum install -y openssh-server
RUN mkdir /var/run/sshd
RUN mkdir /var/log/sshd
RUN ssh-keygen -t rsa -f /etc/ssh/ssh_host_rsa_key -N ''
# Configure supervisord to run ssh at startup.
ADD sshd-server-startup.conf /etc/supervisord.d/sshd-server-startup.conf
# sshd will be listening on port 22.
EXPOSE 22

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

# Create mount points for persistent data.
VOLUME /var/lib/couchdb
VOLUME /var/lib/slycat
VOLUME /var/log/couchdb
VOLUME /var/log/slycat

# We don't specify a startup command, since the base image already starts
# supervisord for us.
