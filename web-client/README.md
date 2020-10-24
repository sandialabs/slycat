# Slycat Web Client
> The Slycat web client provides a Python package for interacting with the Slycat web server.

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

**Note that for the Slycat web client to work, you must have a Slycat server running.  See https://slycat.readthedocs.io/en/latest/ for details on setting up a server.**

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

In addition, there are two entry points defined for the Slycat Dial-A-Cluster plugin

```sh
$ dac_tdms
```

and

```sh
$ dac_tdms_batch
```

These are described in greater detail below.

## User Authentication

The Slycat server requires user authentication.  Each example in This
directory takes the same inputs for the authentication process, the
options being provided by the slycat.web.client module.

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

To upload a DAC TDMS model, use

```sh
$ dac_tdms data-file.TDM
```

This will create a model from a single .TDM file.  You can also use .TDMS
files and .zip archives containing .tdms files.  The options available
for the creation of the models are the same as the options available using
the DAC model creation wizard in the browser.  To see the options use
the "--help" flag when calling the script.

In addition, a batch script is available for uploading multiple DAC TDMS
models.  To use this script, you must first create a file containing the
options for each model.  The file has the following format.

Line 1 contains the authentication information for the Slycat server that
you would pass to the dac_create_tdms_model script, but separated by commas.
For example,

    --user,smartin,--kerberos

If authentication information is unnecessary, just leave the line blank.

Line 2 contains the project information for the project that will contain
the DAC models to be created, e.g.

    --project-name,Batch TDMS Models

Line 2 can also be left blank.  It will default to "Batch TDMS Models".
Lines 3 and beyond contain the model information for each model, such as

    model-data-file-1.tdms,--model-name,Model 1
    model-data-file-2.tdms,--model-name,Model 2

Note that you must supply a model file (or multiple files) in accordance
with the dac_create_tdms_model script for each model.  Also note that if 
you want to put models into different projects, you can override the 
original project given in line 2, by using the "--project-name" flag 
again, e.g.

    model-data-file-n.tdms,--model-name,Model n,--project-name,Special Project

After the batch file has been created, you can call the TDMS batch 
processor to create your models using:

```sh
$ dac_tdms_batch tdms-batch-file.txt
```

where tdms-batch-file.txt is the .txt file containing the lines just 
described.

Depending on how many models are being created, it is helpful to
use the "--log_file" flag to specify a log file for recording any
errors in the upload process.

## Meta

Shawn Martin -- smartin@sandia.gov

Distributed under the Sandia license. See LICENSE file for more information.