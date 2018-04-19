FROM sandialabs/slycat-base
MAINTAINER Matthew Letter <mletter@sandia.gov>


USER root
# the developer run-slycat version starts sshd
COPY run-slycat.sh /etc/slycat/
# add machine uuid
RUN dbus-uuidgen > /var/lib/dbus/machine-id && \
# add developer python packages
    /home/slycat/install/conda/bin/pip install --trusted-host pypi.python.org --trusted-host pypi.org --trusted-host files.pythonhosted.org nose selenium pyvirtualdisplay && \
# assign a password to root and slycat
    echo 'root:slycat' | chpasswd; echo 'slycat:slycat' | chpasswd && \
# Generate a private certificate authority.
    openssl genrsa -out /root-ca.key 2048 && \
    openssl req -x509 -new -nodes -key /root-ca.key -days 365 -out /root-ca.cert -subj "/C=US/ST=New Mexico/L=Albuquerque/O=The Slycat Project/OU=QA/CN=Slycat" && \
# Generate a self-signed certificate
    openssl genrsa -out /web-server.key 2048 && \
    openssl req -new -key /web-server.key -out /web-server.csr -subj "/C=US/ST=New Mexico/L=Albuquerque/O=The Slycat Project/OU=QA/CN=localhost" && \
    openssl x509 -req -sha256 -in /web-server.csr -CA /root-ca.cert -CAkey /root-ca.key -CAcreateserial -out /web-server.cert -days 1825 && \
    cat /web-server.key /web-server.cert > /etc/slycat/combined.cer; chgrp slycat /etc/slycat/combined.cer; chmod 440 /etc/slycat/combined.cer && \
# Add our private CA to the system-wide list of certificate authorities, so push scripts will trust the web-server.
    cp /root-ca.cert /etc/pki/ca-trust/source/anchors/ && \
    /usr/bin/update-ca-trust && \
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
    yum install -y openssh-server sudo screen cmake qt-devel libxml2-devel libxslt-devel qtwebkit-devel xorg-x11-server-Xvfb firefox && \
    yum clean all && \
# Setup the sshd service.
    mkdir /var/run/sshd; mkdir /var/log/sshd; ssh-keygen -t rsa -f /etc/ssh/ssh_host_rsa_key -N '' && \
# Set reasonable ssh timeouts for development.
    sed -e 's/^#ClientAliveInterval .*$/ClientAliveInterval 60/' -i /etc/ssh/sshd_config && \
    sed -e 's/^#ClientAliveCountMax .*$/ClientAliveInterval 10080/' -i /etc/ssh/sshd_config && \
# Make the slycat user a sudoer.
    /usr/sbin/usermod -a -G wheel slycat && \
    sed -e 's/^# %wheel\tALL=(ALL)\tALL$/%wheel\tALL=(ALL)\tALL/' -i /etc/sudoers && \
    cd /usr/bin && \
    ln -s /home/slycat/install/conda/bin/pip pip

RUN su slycat && \
    cd /home/slycat && \
    wget --no-check-certificate https://github.com/mozilla/geckodriver/releases/download/v0.11.1/geckodriver-v0.11.1-linux64.tar.gz; tar xf geckodriver-v0.11.1-linux64.tar.gz

RUN cd /home/slycat && \
    cp geckodriver /usr/bin/geckodriver && \
    ls /usr/bin | grep geckodriver && \
#RUN rm /etc/slycat/run-slycat.sh
#RUN rm /etc/slycat/web-server-config.ini
# put the appropriate web server config in place
#RUN ln -s /home/slycat/src/slycat/docker/slycat-developer/web-server-config.ini /etc/slycat/web-server-config.ini
#RUN ln -s /home/slycat/src/slycat/docker/slycat-developer/run-slycat.sh /etc/slycat/run-slycat.sh
    cd /home/slycat/src/slycat && \
    git pull && \
# Configure vim and setup useful aliases.
    echo "alias vi=vim" >> /home/slycat/.bash && \
# Setup useful git defaults.
    HOME=/home/slycat git config --global color.ui true && \
    /home/slycat/install/conda/bin/pip install --trusted-host pypi.python.org --trusted-host pypi.org --trusted-host files.pythonhosted.org behave && \
    echo "alias testslycat=\"behave -i \\\"(agent|hyperchunks|rest-api)\\\" /home/slycat/src/slycat/features/\"" >> /home/slycat/.bashrc

ADD .vimrc /home/slycat/.vimrc
# Make sure we find qmake for pyside
ENV PATH /usr/lib64/qt4/bin:$PATH
# We want CouchDB to listen on all network interfaces, so developers can use its web UI.
# CouchDB will be listening on port 5984.
EXPOSE 5984
EXPOSE 22
USER root
RUN chmod -R 750 /etc/slycat && \
#RUN chmod -R 750 /home/slycat/
#RUN chown --recursive slycat:slycat /home/slycat/
    chown --recursive root:slycat /etc/slycat/ && \
    service couchdb start; sleep 2 && \
    bash && \
    source /home/slycat/.bashrc && \
    /home/slycat/install/conda/bin/python /home/slycat/src/slycat/web-server/slycat-couchdb-setup.py;sleep 2 && \
    /home/slycat/install/conda/bin/python /home/slycat/src/slycat/web-server/slycat-load.py --data-store /var/lib/slycat/data-store /home/slycat/src/slycat/docker/DB/ ;sleep 4 && \
    chown -R slycat:slycat /var/lib/slycat/data-store && \
    service couchdb stop; sleep 2

ENTRYPOINT ["/bin/sh","/etc/slycat/run-slycat.sh"]
