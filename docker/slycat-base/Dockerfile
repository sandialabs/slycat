FROM centos:6.9
MAINTAINER Matthew Letter <mletter@sandia.gov>
# setup needed environment
# install required additional OS packages
ADD bintray-apache-couchdb-rpm.repo /etc/yum.repos.d/bintray-apache-couchdb-rpm.repo
RUN yum install -y yum-plugin-ovl && \
    yum -y update && \
    yum install -y epel-release&& \
    cat /etc/yum.repos.d/epel.repo && \
    sed -i 's|https|http|g' /etc/yum.repos.d/epel.repo && \
    cat /etc/yum.repos.d/epel.repo && \
    yum install -y hdf5-devel haproxy lapack-devel openldap-devel openssl-devel && \
    yum install -y lcms2-devel && \
    yum install -y tcl-devel tkinter libjpeg-turbo-devel && \
    yum install -y openjpeg-devel libtiff-devel libffi-devel libX11-devel htop && \
    yum install -y hdf5-devel && \
    yum groupinstall -y Base && \
    yum groupinstall -y "Development Tools" && \
    yum groupinstall -y Emacs git && \
# create a slycat user
    groupadd -g 500 slycat && \
    useradd -u 500 -g 500 slycat && \
    mkdir /etc/slycat && \
    chgrp slycat /etc/slycat && \
    chmod g+w /etc/slycat && \
# slycat's environment, directories, and files
    su slycat && \
    mkdir -p /home/slycat/src/python && \
    mkdir /home/slycat/install && \
    echo "export PATH=/home/slycat/install/conda/bin:$PATH" >> /home/slycat/.bashrc && \
    echo "export PYTHONPATH=/home/slycat/src/slycat/packages" >> /home/slycat/.bashrc && \
    cd /home/slycat/src/python && \
    wget -nv --no-check-certificate http://repo.continuum.io/miniconda/Miniconda-latest-Linux-x86_64.sh -O miniconda.sh && \
    chmod u+x miniconda.sh; ./miniconda.sh -b -p /home/slycat/install/conda && \
    /home/slycat/install/conda/bin/conda config --set ssl_verify false && \
    /home/slycat/install/conda/bin/conda update --yes python && \
    /home/slycat/install/conda/bin/conda update --yes conda && \
    /home/slycat/install/conda/bin/conda install --yes pip && \
    /home/slycat/install/conda/bin/pip install --trusted-host pypi.python.org -U pip && \
    /home/slycat/install/conda/bin/pip install --trusted-host pypi.python.org CouchDB setuptools_scm h5py ipython paramiko Pillow scipy scikit-image "pyparsing>=2.0.3" pystache routes ipyparallel pyzmq sklearn opencv-python && \
    /home/slycat/install/conda/bin/pip install --trusted-host pypi.python.org cherrypy && \
# checkout the slycat, dial-a-cluster
    cd /home/slycat/src && \
    git config --global http.sslVerify false && \
#RUN cd /home/slycat/src;GIT_TRACE=1 GIT_CURL_VERBOSE=1 git clone https://github.com/sandialabs/slycat.git
    git clone https://github.com/sandialabs/slycat.git && \
    git clone https://github.com/sandialabs/dial-a-cluster.git && \
    git clone https://github.com/sandialabs/slycat-data.git && \
# this is the dial-a-cluster plugin code, leaving out for the moment
# back to root, install couchdb, complete system setup
    chmod -R 755 /home/slycat/src && \
    yum install -y autoconf autoconf-archive automake curl-devel erlang-asn1 erlang-erts erlang-eunit gcc-c++ erlang-os_mon erlang-xmerl erlang-erl_interface help2man js-devel-1.8.5 libicu-devel libtool perl-Test-Harness && \
    yum install -y erlang-reltool && \
    yum install -y couchdb && \
    cp /etc/haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg_orig && \
    rm /etc/haproxy/haproxy.cfg

USER slycat
ADD slycat-web-server /etc/slycat/

USER root
ADD proxy-server-config.conf /etc/haproxy/haproxy.cfg
ADD rsyslog-config.conf /etc/rsyslog.d/haproxy.conf

RUN ln -s /etc/slycat/slycat-web-server /etc/rc.d/init.d/slycat-web-server && \
# Create a directory to contain HDF5 files stored by Slycat.
    mkdir -p /var/lib/slycat/data-store && \
    chown --recursive slycat:slycat /var/lib/slycat && \
# Create a directory to contain the Slycat logfiles.
    mkdir -p /var/log/slycat && \
    chown slycat:slycat /var/log/slycat && \
    chmod -R 750 /etc/slycat && \
    chown --recursive root:slycat /etc/slycat/

EXPOSE 443
COPY web-server-config.ini /etc/slycat/
COPY run-slycat.sh /etc/slycat/
ENTRYPOINT ["/bin/sh","/etc/slycat/run-slycat.sh"]
