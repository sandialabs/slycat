FROM fedora:20
MAINTAINER Timothy M. Shead <tshead@sandia.gov>

RUN yum install -y couchdb git python-devel python-pip numpy scipy python-couchdb python-paramiko python-routes pyOpenSSL python-requests python-ldap python-nose python-coverage python-sphinx python-pillow python-sphinx_rtd_theme h5py pystache

RUN yum install -y openssh-server
RUN mkdir /var/run/sshd
RUN ssh-keygen -t rsa -f /etc/ssh/ssh_host_rsa_key -N ''
RUN echo 'root:slycat' | chpasswd

RUN pip install cherrypy==3.2.6 sphinxcontrib-napoleon

RUN git clone https://github.com/sandialabs/slycat.git

RUN sed -e 's/^bind_address = .*$/bind_address = 0.0.0.0/' -i /etc/couchdb/default.ini

EXPOSE 22
EXPOSE 5984
EXPOSE 8092

ADD startup.sh /startup.sh
CMD /bin/bash /startup.sh

