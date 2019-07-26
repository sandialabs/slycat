ARG IMAGE_VERSION

FROM python:$IMAGE_VERSION

WORKDIR /usr/src/app

COPY requirements.txt ./

RUN pip install --trusted-host files.pythonhosted.org --trusted-host pypi.org --trusted-host pypi.python.org --no-cache-dir --upgrade pip

RUN pip install --trusted-host files.pythonhosted.org --trusted-host pypi.org --trusted-host pypi.python.org --no-cache-dir -r requirements.txt
RUN pip install --trusted-host files.pythonhosted.org --trusted-host pypi.org --trusted-host pypi.python.org couchdb

COPY app.py .
COPY slycat-couchdb-setup.py .

# RUN python slycat-couchdb-setup.py

ENV FLASK_APP=app.py

# CMD flask run --host=0.0.0.0
CMD python /usr/src/app/slycat-couchdb-setup.py