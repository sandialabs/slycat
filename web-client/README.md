# Slycat Web Client
The Slycat web client provides a Python package for interacting with the Slycat web server.

Slycat is a web based data analysis and visualization platform created at Sandia
National Labs.  You can read about it at https://slycat.readthedocs.io/en/latest/.
Slycat is open source and can be downloaded from https://github.com/sandialabs/slycat.

The Slycat web client provides a Python package which can be used
to interact with the Slycat web server.  The web client provides Python routines
to query the Slycat server and create Slycat data analysis models.

## Installation

```sh
pip install slycat-web-client
```

If you are working behind a proxy, you might also need, e.g.

```sh
pip install slycat-web-client --proxy your-proxy:your-port
```

If you are getting SSL certificate errors, you can use:

```sh
pip install slycat-web-client --trusted-host pypi.org --trusted-host files.pythonhosted.org
```

Be aware that the last option is insecure.  The better approach is to 
fix your SSL certificate and/or point Python to a copy of the certificate.
This can be done using:

```sh
pip config set global.cert path-to-your-certificate
```

Note: that for the Slycat web client to work, you must have a Slycat server running.  
See https://slycat.readthedocs.io/en/latest/ for details on setting up a server.

## Basic Use

The Slycat web client can be imported from within a Python file using

    import slycat.web.client

Some examples using the web client can be found in the slycat/web/client
source directory.  These can be run using, e.g.

```sh
$ python list_markings.py
```

or

```sh
$ python -m slycat.web.client.list_markings
```

## User Authentication

The Slycat server requires user authentication.  The slycat.web.client
module provides the options for the authentication process.

For example, to use standard password authentication for a Slycat
server running on https://localhost:9000 without a security certificate,
use:

```sh
$ python -m slycat.web.client.list_markings.py --user slycat --port 9000 --no-verify
```

Or, to access a Kerberos authenticated server running at slycat.sandia.gov,
use:

```sh
$ python -m slycat.web.client.list_markings.py --host https://slycat.sandia.gov --kerberos
```

## Kerberos

The --kerberos option relies on a working Kerberos installation on your system.  Sometimes
this will fail.  If you get an error related to Kerberos credentials (e.g. "Couldn't find
Kerberos ticket," or "User not Kerberos authenticated"), try:

```sh
$ kinit
```

Then re-run the original command.

## Proxies/Certificates

If you are separated from the Slycat server by a proxy, or have not set up a security
certificate, you will have to use the slycat.web.client proxy settings.  The proxy
settings are available using the flags:

* --http-proxy
* --https-proxy
* --verify
* --no-verify

The proxy flags are by default set to "no proxy".  If you have proxies set in the
environment variables, they will be ignored.  The proxy flags are used as follows
(for example):

```sh
$ python -m slycat.web.client.list_markings.py --http-proxy http://your.http.proxy --https-proxy https://your.https.proxy
```

The verify flag can be used to pass a security certificate as a command line argument and
the --no-verify flag can be used to ignore the security certificates altogether.
 
## General Utilities

The simplest examples of interacting with the Slycat server issue
requests for markings and projects, e.g.

```sh
$ python -m slycat.web.client.list_markings.py
$ python -m slcyat.web.client.list_projects.py
```

To examine a particular model or project, use

```sh
$ python -m slycat.web.client.get_model.py mid
$ python -m slycat.web.client.get_project.py pid
```

where mid and pid are the hash identifiers for a Slycat model
or project residing on the Slycat server.  These IDs can be extracted
from the URL in the Slycat web browser client, or by using
Info -> Model Details from the browser.

## Creating Models

The slycat.web.client provides a command line option for creating Slycat
models.  For example, to create a sample CCA model using random data, use:

```sh
$ python -m slycat.web.client.cca_random.py
```

To create a sample CCA model from a CSV file, use:

```sh
$ python -m slycat.web.client.cca_csv.py slycat-data/cars.csv --input Cylinders Displacement Weight Year --output MPG Horsepower Acceleration
```

where "slycat-data/cars.csv" is from the slycat-data git repository at
https://github.com/sandialabs/slycat-data.

Note that when a model is created, the URL is given in the console and
can be copied into a web browser to display the model.  The model ID
can also be extracted from this URL (it is the hash at the end of the URL).

## Dial-A-Cluster (DAC) Models

Dial-A-Cluster models can be loaded using different formats.  The first
format is the generic dial-a-cluster format, described more fully in
the Slycat user manual.

To upload a DAC generic .zip file, use

```sh
$ dac_gen dac-gen.zip
```

This will create a model from a single .zip file containing the appropriate
folders with the pre-computed distance or PCA matrices.

## Parameter Space Models

A Parameter Space model can be created from .csv file using the 
ps_csv script.  From the command line, use:

```sh
$ python -m slycat.web.client.ps_csv slycat-data/cars.csv --input-columns Cylinders Displacement Weight Year --output-columns MPG Horsepower Acceleration
```

To push up a .csv file from a python script, use the slycat-web-client
module.  For example:

```{python}
import slycat.web.client.ps_csv as ps_csv

# parameter space file
CARS_FILE = ['../../slycat-data/cars.csv']

# input/output columns for cars data file
CARS_INPUT = ['--input-columns', 'Model', 'Cylinders', 'Displacement', 'Weight', 'Year']
CARS_OUTPUT = ['--output-columns', 'MPG', 'Horsepower', 'Acceleration']

# create PS model from cars file
ps_parser = ps_csv.parser()
arguments = ps_parser.parse_args(CARS_FILE + CARS_INPUT + CARS_OUTPUT)
ps_csv.create_model(arguments, ps_csv.log)     

```

## API

You should be able to find the API for slycat.web.client at 
https://slycat.readthedocs.io/en/latest/.

## Contact

Shawn Martin -- smartin@sandia.gov

Distributed under the Sandia license. See LICENSE file for more information.