FROM sandialabs/slycat-base
MAINTAINER Matthew Letter <mletter@sandia.gov>


USER root

# add machine uuid
RUN dbus-uuidgen > /var/lib/dbus/machine-id

# add developer python packages
RUN /home/slycat/install/conda/bin/pip install --trusted-host pypi.python.org nose selenium pyvirtualdisplay
# the developer run-slycat version starts sshd
COPY run-slycat.sh /etc/slycat/

# assign a password to root and slycat
RUN echo 'root:slycat' | chpasswd; echo 'slycat:slycat' | chpasswd

# Generate a private certificate authority.
RUN openssl genrsa -out /root-ca.key 2048
RUN openssl req -x509 -new -nodes -key /root-ca.key -days 365 -out /root-ca.cert -subj "/C=US/ST=New Mexico/L=Albuquerque/O=The Slycat Project/OU=QA/CN=Slycat"
# Generate a self-signed certificate
RUN openssl genrsa -out /web-server.key 2048
RUN openssl req -new -key /web-server.key -out /web-server.csr -subj "/C=US/ST=New Mexico/L=Albuquerque/O=The Slycat Project/OU=QA/CN=localhost"
RUN openssl x509 -req -in /web-server.csr -CA /root-ca.cert -CAkey /root-ca.key -CAcreateserial -out web-server.cert -days 365

RUN cat /web-server.key /web-server.cert > /etc/slycat/combined.cer; chgrp slycat /etc/slycat/combined.cer; chmod 440 /etc/slycat/combined.cer
# Add our private CA to the system-wide list of certificate authorities, so push scripts will trust the web-server.
RUN cp /root-ca.cert /etc/pki/ca-trust/source/anchors/
RUN /usr/bin/update-ca-trust


# Python packages previously present:
#   python-coverage python-nose python-sphinx python-sphinx_rtd_theme behave
#   sphinxcontrib-httpdomain sphinxcontrib-napoleon pyside Ghost.py
#
# Additional python packages may be added to this python installation. The procedure
# overview is: install Miniconda, add the additional packages to conda by running
# each package's setup.py, run conda's package utility. Below is a more detailed
# procedure. Refer to slycat-base/Dockerfile for more examples.
# -install Miniconda
# -set PATH so <conda path>/bin is default python
# -download and un-tar additional python packages into their own dirs
# -cd into each pkg dir, run "python setup.py install"
# -create a Slycat additions package with "conda package --pkg-name=<some_name> --pkg-version=<date>"
# Install the additions with "conda install your_package"


# Install yum packages for development.
RUN yum install -y openssh-server; yum clean all
RUN yum install -y sudo; yum clean all
RUN yum install -y screen; yum clean all

# Install yum packages for testing
RUN yum -y install cmake qt-devel libxml2-devel libxslt-devel qtwebkit-devel xorg-x11-server-Xvfb firefox; yum clean all

# Make sure we find qmake for pyside
ENV PATH /usr/lib64/qt4/bin:$PATH

# Setup the sshd service.
RUN mkdir /var/run/sshd; mkdir /var/log/sshd; ssh-keygen -t rsa -f /etc/ssh/ssh_host_rsa_key -N ''
# Set reasonable ssh timeouts for development.
RUN sed -e 's/^#ClientAliveInterval .*$/ClientAliveInterval 60/' -i /etc/ssh/sshd_config
RUN sed -e 's/^#ClientAliveCountMax .*$/ClientAliveInterval 10080/' -i /etc/ssh/sshd_config

EXPOSE 22

# Make the slycat user a sudoer.
RUN /usr/sbin/usermod -a -G wheel slycat
RUN sed -e 's/^# %wheel\tALL=(ALL)\tALL$/%wheel\tALL=(ALL)\tALL/' -i /etc/sudoers

# We want CouchDB to listen on all network interfaces, so developers can use its web UI.
# CouchDB will be listening on port 5984.
EXPOSE 5984

RUN cd /usr/bin; ln -s /home/slycat/install/conda/bin/pip pip


USER slycat
RUN cd /home/slycat; wget --no-check-certificate https://github.com/mozilla/geckodriver/releases/download/v0.11.1/geckodriver-v0.11.1-linux64.tar.gz; tar xf geckodriver-v0.11.1-linux64.tar.gz

USER root
RUN cd /home/slycat; cp geckodriver /usr/bin/geckodriver

USER slycat

RUN cd /home/slycat/src/slycat; git pull
# put the appropriate web server config in place
RUN rm /etc/slycat/run-slycat.sh
RUN rm /etc/slycat/web-server-config.ini

RUN ln -s /home/slycat/src/slycat/docker/slycat-developer/web-server-config.ini /etc/slycat/web-server-config.ini
RUN ln -s /home/slycat/src/slycat/docker/slycat-developer/run-slycat.sh /etc/slycat/run-slycat.sh
# Configure vim and setup useful aliases.
RUN echo "alias vi=vim" >> /home/slycat/.bash
ADD .vimrc /home/slycat/.vimrc
# Setup useful git defaults.
RUN HOME=/home/slycat git config --global color.ui true
RUN /home/slycat/install/conda/bin/pip install --trusted-host pypi.python.org behave
RUN echo "alias testslycat=\"behave -i \\\"(agent|hyperchunks|rest-api)\\\" /home/slycat/src/slycat/features/\"" >> /home/slycat/.bashrc


USER root
RUN chmod -r 750 /etc/slycat
RUN chown --recursive root:slycat /etc/slycat/
