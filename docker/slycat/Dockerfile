FROM sandialabs/sshd
MAINTAINER Timothy M. Shead <tshead@sandia.gov>

# Install yum packages.
RUN yum install -y couchdb git python-devel python-pip numpy scipy python-couchdb python-paramiko python-routes pyOpenSSL python-requests python-ldap python-nose python-coverage python-sphinx python-pillow python-sphinx_rtd_theme h5py pystache dejavu-serif-fonts python-zmq make vim

# Install Python modules.
RUN pip install cherrypy==3.2.6 sphinxcontrib-napoleon ipython

# Setup the root user.
RUN echo 'root:slycat' | chpasswd

# Setup the Slycat user.
RUN /usr/sbin/useradd --create-home --home-dir /home/slycat --shell /bin/bash -G wheel slycat
RUN echo 'slycat:slycat' | chpasswd
USER slycat
RUN echo "export PYTHONPATH=/home/slycat/src/slycat/packages" >> /home/slycat/.bash_profile
RUN echo "export REQUESTS_CA_BUNDLE=/home/slycat/src/slycat/web-server/root-ca.pem" >> /home/slycat/.bash_profile
RUN echo "alias vi=vim" >> /home/slycat/.bash_profile
ADD .vimrc /home/slycat/.vimrc
RUN mkdir /home/slycat/src; cd /home/slycat/src; git clone https://github.com/sandialabs/slycat.git

# Setup the couchdb server.
ADD couchdb.conf /etc/supervisord.d/couchdb.conf
RUN mkdir /var/log/couchdb
#RUN sed -e 's/^bind_address = .*$/bind_address = 0.0.0.0/' -i /etc/couchdb/default.ini

# Setup the Slycat server.
ADD slycat.conf /etc/supervisord.d/slycat.conf
EXPOSE 8092

# We don't specify a startup command, since the base image already starts
# supervisord for us.
