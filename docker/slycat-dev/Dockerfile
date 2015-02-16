FROM sandialabs/slycat
MAINTAINER Timothy M. Shead <tshead@sandia.gov>

# Install yum packages for development.
RUN yum install -y htop make python-coverage python-nose python-sphinx python-sphinx_rtd_theme vim wget

# Install Python modules for development.
RUN pip install behave sphinxcontrib-httpdomain sphinxcontrib-napoleon

# The following commands are run as user "slycat".
USER slycat
# Configure vim and setup useful aliases.
RUN echo "alias vi=vim" >> /home/slycat/.bash_profile
ADD .vimrc /home/slycat/.vimrc
# Setup useful git defaults.
RUN touch /home/slycat/.gitconfig
RUN HOME=/home/slycat git config --global push.default simple
RUN HOME=/home/slycat git config --global color.ui true

# The following commands are run as root.
USER root
# Set reasonable ssh timeouts for development.
RUN sed -e 's/^#ClientAliveInterval .*$/ClientAliveInterval 60/' -i /etc/ssh/sshd_config
RUN sed -e 's/^#ClientAliveCountMax .*$/ClientAliveInterval 10080/' -i /etc/ssh/sshd_config

# Overwrite the default supervisord configuration so we can use supervisorctl.
ADD supervisord.conf /etc/supervisord.conf
# Supervisord will be listening on port 9001.
EXPOSE 9001

# We don't specify a startup command, since the base image already starts
# supervisord for us.
