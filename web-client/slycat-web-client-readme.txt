This directory contains examples for using the Python module
slycat.web.client.  Each example show how to use Python to interact
with the Slycat web server.  The simplest examples issue
requests for markings and projects, e.g.

$ python slycat-list-markings.py
$ python slycat-list-projects.py

Note that in both of these cases, or when using any of the examples,
different parameters can be used to specify the Slycat server and
method of authentication.  The full list of parameters can be seen
by using the --help flag.  For example:

$ python slycat-list-markings.py --help

For example, to use standard password authentication for a Slycat
server running on https://localhost:9000 without a security certificate,
use:

$ python slycat-list-markings.py --user slycat --port 9000 --no-verify

To access a Kerberos authenticated server running at slycat.sandia.gov,
use:

$ python slycat-list-markings.py --host https://slycat.sandia.gov --kerberos

To show model properties, try:

$ python slycat-get-model.py <mid>

To show project properites, try:

$ python slycat-get-projects.py <pid>

To create a sample CCA model using random data, use:

$ python slcyat-create-sample-cca-model.py

To create a sample CCA model from a CSV file, use:

$ python slycat-create-cca-model-from-csv.py slycat-data/cars.csv 
    --input Cylinders Displacement Weight Year 
    --output MPG Horsepower Acceleration

where "slycat-data/cars.csv" is from the slycat-data git repository.

