FROM sandialabs/supervisord
MAINTAINER Timothy M. Shead <tshead@sandia.gov>

# Setup the sshd service.
RUN yum install -y openssh-server
RUN mkdir /var/run/sshd
RUN mkdir /var/log/sshd
RUN ssh-keygen -t rsa -f /etc/ssh/ssh_host_rsa_key -N ''
ADD sshd-server-startup.conf /etc/supervisord.d/sshd-server-startup.conf

EXPOSE 22

# We don't specify a startup command, since the base image already starts
# supervisord for us.
