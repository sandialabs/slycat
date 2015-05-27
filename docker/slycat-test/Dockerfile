FROM sandialabs/slycat-demo
MAINTAINER David R Lochridge <drlochr@sandia.gov>

# Install support packages for testing
RUN yum -y install make cmake qt-devel libxml2-devel libxslt-devel gcc-c++ qtwebkit-devel xorg-x11-server-Xvfb
# Make sure we find qmake for pyside
ENV PATH /usr/lib64/qt4/bin:$PATH
# Install engines for the tests
RUN pip install behave pyside Ghost.py

WORKDIR /home/slycat/src/slycat
CMD behave
