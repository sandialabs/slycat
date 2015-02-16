FROM sandialabs/supervisord
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

# We don't specify a startup command, since the base image already starts
# supervisord for us.
