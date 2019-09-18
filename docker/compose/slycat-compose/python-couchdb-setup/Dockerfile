ARG IMAGE_VERSION

FROM python:$IMAGE_VERSION

WORKDIR /usr/src/couch

RUN pip install --trusted-host files.pythonhosted.org --trusted-host pypi.org --trusted-host pypi.python.org --no-cache-dir --upgrade pip
RUN pip install --trusted-host files.pythonhosted.org --trusted-host pypi.org --trusted-host pypi.python.org couchdb

COPY slycat-couchdb-setup.py .
