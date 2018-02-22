FROM centos:6.6
MAINTAINER Matthew Letter <mletter@sandia.gov>

# setup needed environment
# install required additional OS packages
RUN yum -y update
RUN yum install -y epel-release; yum clean all
RUN cat /etc/yum.repos.d/epel.repo
RUN sed -i 's|https|http|g' /etc/yum.repos.d/epel.repo
RUN cat /etc/yum.repos.d/epel.repo

RUN yum install -y hdf5-devel haproxy lapack-devel openldap-devel openssl-devel; yum clean all
RUN yum install -y lcms2-devel; yum clean all
RUN yum install -y tcl-devel tkinter libjpeg-turbo-devel; yum clean all
RUN yum install -y openjpeg-devel libtiff-devel libffi-devel libX11-devel htop; yum clean all

# for some twisted reason we don't get hdf5-devel from above
RUN yum install -y hdf5-devel; yum clean all

RUN yum groupinstall -y Base; yum clean all
RUN yum groupinstall -y "Development Tools"; yum clean all
RUN yum groupinstall -y Emacs git; yum clean all

# create a slycat user
RUN groupadd -g 500 slycat; useradd -u 500 -g 500 slycat
RUN mkdir /etc/slycat; chgrp slycat /etc/slycat; chmod g+w /etc/slycat

# slycat's environment, directories, and files
USER slycat
RUN mkdir -p /home/slycat/src/python; mkdir /home/slycat/install; echo "export PATH=/home/slycat/install/conda/bin:$PATH" >> /home/slycat/.bashrc; echo "export PYTHONPATH=/home/slycat/src/slycat/packages" >> /home/slycat/.bashrc;

RUN cd /home/slycat/src/python; wget -nv --no-check-certificate http://repo.continuum.io/miniconda/Miniconda-latest-Linux-x86_64.sh -O miniconda.sh; chmod u+x miniconda.sh; ./miniconda.sh -b -p /home/slycat/install/conda

RUN /home/slycat/install/conda/bin/conda config --set ssl_verify false
RUN /home/slycat/install/conda/bin/conda update --yes python
RUN /home/slycat/install/conda/bin/conda update --yes conda
RUN /home/slycat/install/conda/bin/conda install --yes pip
#RUN /home/slycat/install/conda/bin/conda install --yes paramiko Pillow scipy scikit-image
RUN /home/slycat/install/conda/bin/pip install --trusted-host pypi.python.org -U pip
RUN /home/slycat/install/conda/bin/pip install --trusted-host pypi.python.org CouchDB
RUN /home/slycat/install/conda/bin/pip install --trusted-host pypi.python.org setuptools_scm h5py ipython paramiko Pillow scipy scikit-image
RUN /home/slycat/install/conda/bin/pip install --trusted-host pypi.python.org cherrypy
RUN /home/slycat/install/conda/bin/pip install --trusted-host pypi.python.org "pyparsing>=2.0.3" pystache routes ipyparallel pyzmq
RUN /home/slycat/install/conda/bin/pip install --trusted-host pypi.python.org sklearn
RUN /home/slycat/install/conda/bin/pip install --trusted-host pypi.python.org opencv-python
# checkout the slycat, dial-a-cluster
RUN git config --global http.sslVerify false
#RUN cd /home/slycat/src;GIT_TRACE=1 GIT_CURL_VERBOSE=1 git clone https://github.com/sandialabs/slycat.git

RUN cd /home/slycat/src; git clone https://github.com/sandialabs/slycat.git
RUN cd /home/slycat/src; git clone https://github.com/sandialabs/dial-a-cluster.git

# this is the dial-a-cluster plugin code, leaving out for the moment

ADD slycat-web-server /etc/slycat/

# build couchdb
ADD bintray-apache-couchdb-rpm.repo /etc/yum.repos.d/bintray-apache-couchdb-rpm.repo

# back to root, install couchdb, complete system setup
USER root
RUN chmod -R 755 /home/slycat/src
RUN yum install -y autoconf autoconf-archive automake curl-devel erlang-asn1 erlang-erts erlang-eunit gcc-c++ erlang-os_mon erlang-xmerl erlang-erl_interface help2man js-devel-1.8.5 libicu-devel libtool perl-Test-Harness; yum clean all
RUN yum install -y erlang-reltool; yum clean all
RUN yum -y install couchdb; yum clean all

RUN cp /etc/haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg_orig;

RUN rm /etc/haproxy/haproxy.cfg
ADD proxy-server-config.conf /etc/haproxy/haproxy.cfg
ADD rsyslog-config.conf /etc/rsyslog.d/haproxy.conf

RUN ln -s /etc/slycat/slycat-web-server /etc/rc.d/init.d/slycat-web-server

# Create a directory to contain HDF5 files stored by Slycat.
RUN mkdir -p /var/lib/slycat/data-store
RUN chown --recursive slycat:slycat /var/lib/slycat
# Create a directory to contain the Slycat logfiles.
RUN mkdir -p /var/log/slycat
RUN chown slycat:slycat /var/log/slycat

EXPOSE 443
COPY web-server-config.ini /etc/slycat/
COPY run-slycat.sh /etc/slycat/
RUN chmod -r 750 /etc/slycat
RUN chown --recursive root:slycat /etc/slycat/
CMD /etc/slycat/run-slycat.sh
