FROM sandialabs/slycat
MAINTAINER Timothy M. Shead <tshead@sandia.gov>

# Install yum packages for development.
RUN yum install -y make python-coverage python-nose python-sphinx python-sphinx_rtd_theme vim wget

# Install Python modules for development.
RUN pip install behave sphinxcontrib-napoleon

# Setup the Slycat user for development.
USER slycat
RUN echo "alias vi=vim" >> /home/slycat/.bash_profile
RUN touch /home/slycat/.gitconfig
RUN HOME=/home/slycat git config --global push.default simple
RUN HOME=/home/slycat git config --global color.ui true
ADD .vimrc /home/slycat/.vimrc

# Setup the sshd server for development.
USER root
RUN sed -e 's/^#ClientAliveInterval .*$/ClientAliveInterval 60/' -i /etc/ssh/sshd_config
RUN sed -e 's/^#ClientAliveCountMax .*$/ClientAliveInterval 10080/' -i /etc/ssh/sshd_config

# Setup the Slycat server for development.
RUN rm /etc/supervisord.d/slycat.conf

EXPOSE 8092

# We don't specify a startup command, since the base image already starts
# supervisord for us.
