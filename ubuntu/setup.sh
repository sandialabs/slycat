#!/bin/bash

# setup virtual burrito to manage python env
curl -sL https://raw.githubusercontent.com/brainsik/virtualenv-burrito/master/virtualenv-burrito.sh | $SHELL

source $HOME/.venvburrito/startup.sh

# create a new virtualenv
mkvirtualenv slycat

# make sure we are working on slycat before any pip installs
workon slycat

# add the startup script for virtual burrito to bashrc for future use
if [ ! -f already_updated_bashrc ]; then 
  echo "Updating .bashrc for virtual burrito"
  echo "source $HOME/.venvburrito/startup.sh" >> $HOME/.bashrc 
  # Assuming PWD is where this script lives
  echo "export PYTHONPATH=$PWD/../packages:$PYTHONPATH" >> $HOME/.bashrc
  touch already_updated_bashrc 
fi

# some apt-gets 
sudo apt-get -y install build-essential # basics
sudo apt-get -y install python-dev # for native packages
sudo apt-get -y install libhdf5-serial-dev # for h5py
sudo apt-get -y install libatlas-base-dev gfortran # for scipy
sudo apt-get -y install libfreetype6-dev # for Pillow/PIL
sudo apt-get -y install libffi-dev # for cffi
sudo apt-get -y install libzmq-dev # for pyzmq

# slycat looks in this dir for fonts
sudo apt-get -y install ttf-dejavu
sudo mkdir -p /usr/share/fonts/dejavu/
# link the installed font over
if [ ! -h /usr/share/fonts/dejavu/DejaVuSerif-BoldItalic.ttf ]; then
  sudo ln -s /usr/share/fonts/truetype/ttf-dejavu/DejaVuSerif-BoldItalic.ttf /usr/share/fonts/dejavu/DejaVuSerif-BoldItalic.ttf
fi

# create a requirements.txt file for client setup
if [ ! -f client_requirements.txt ]; then
  echo "Creating client_requirements.txt"
  touch client_requirements.txt
  echo "h5py" >> client_requirements.txt
  echo "ipython" >> client_requirements.txt
  echo "numpy" >> client_requirements.txt
  echo "requests" >> client_requirements.txt
  echo "scipy" >> client_requirements.txt
  echo "pyzmq" >> client_requirements.txt

  echo "Installing Client Requirements ..."
  pip install -q -r client_requirements.txt
  echo "Done, listing installed libs:"
  pip list
fi

# server requirements, more apt-gets
sudo apt-get -y install couchdb git zlib1g-dev libbz2-dev libssl-dev libncurses5-dev liblas-dev liblapack-dev libldap2-dev libreadline-dev libtk-img-dev cpp libpng12-dev chromium-browser libhdf5-serial-dev libjpeg-turbo8-dev
sudo apt-get -y install libsasl2-dev # for python-ldap

# adding server based requirements
if [ ! -f server_requirements.txt ]; then
  echo "Creating server_requirements.txt"
  touch server_requirements.txt
  echo "couchdb" >> server_requirements.txt
  echo "paramiko" >> server_requirements.txt
  echo "routes" >> server_requirements.txt
  echo "pyopenssl" >> server_requirements.txt
  echo "python-ldap" >> server_requirements.txt
  echo "nose" >> server_requirements.txt
  echo "pystache" >> server_requirements.txt
  echo "Jinja2" >> server_requirements.txt
  echo "tornado" >> server_requirements.txt
  echo "Pillow" >> server_requirements.txt
  echo "six" >> server_requirements.txt
  echo "MarkupSafe" >> server_requirements.txt
  echo "cryptography" >> server_requirements.txt
  echo "pycrypto" >> server_requirements.txt
  echo "ecdsa" >> server_requirements.txt
  echo "repoze.lru" >> server_requirements.txt

  echo "Installing Server Requirements ..."
  pip install -q cherrypy==3.2.6
  pip install -q -r server_requirements.txt
  echo "Done, listing installed libs:"
  pip list
fi

# setup for testing
if [ ! -f testing_requirements.txt ]; then
  echo "Creating testing_requirements.txt"
  touch testing_requirements.txt
  echo "coverage" >> testing_requirements.txt
  echo "mock" >> testing_requirements.txt

  echo "Installing Testing Requirements ..."
  pip install -q -r testing_requirements.txt
  echo "Done, listing installed libs:"
  pip list
fi

# notes to setup couchdb and start server
echo "To start a server:"
echo " ** assumes you have couchdb running"
echo "1 - cd to web-server"
echo "2 - python slycat-couchdb-setup.py"
echo "3 - python slycat-web-server.py"
echo "4 - goto localhost:8092"


