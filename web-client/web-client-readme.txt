Slycat Web Client Utilities
---------------------------

This directory contains examples for using the Python module
slycat.web.client.  Each example shows how to use Python to interact
with the Slycat web server.  Each example has a help available by
typing, e.g.

$ python list-markings.py --help

Installing Using Pip
--------------------

You can install the slycat.web.client and DAC TDMS utilities using

$ pip install ...

Authentication to the Slycat Server
-----------------------------------

The Slycat server requires user authentication.  Each example in This
directory takes the same inputs for the authentication process, the
options being provided by the slycat.web.client module.

For example, to use standard password authentication for a Slycat
server running on https://localhost:9000 without a security certificate,
use:

$ python slycat-list-markings.py --user slycat --port 9000 --no-verify

Or, to access a Kerberos authenticated server running at slycat.sandia.gov,
use:

$ python slycat-list-markings.py --host https://slycat.sandia.gov --kerberos

General Utilities
-----------------

The simplest examples of interacting with the Slycat server issue
requests for markings and projects, e.g.

$ python list-markings.py
$ python list-projects.py

To examine a particular model or project, use

$ python get-model.py <mid>
$ python get-project.py <pid>

where <mid> and <pid> are the hash identifiers for a Slycat model
or project residing on the Slycat server.  These IDs can be extracted
from the URL in the Slycat web browser client, or by using
Info -> Model Details from the browser.

Creating Models
---------------

The slycat.web.client provides a command line option for creating Slycat
models.  For example, to create a sample CCA model using random data, use:

$ python cca-create-random-model.py

To create a sample CCA model from a CSV file, use:

$ python cca-create-csv-model.py slycat-data/cars.csv 
    --input Cylinders Displacement Weight Year 
    --output MPG Horsepower Acceleration

where "slycat-data/cars.csv" is from the slycat-data git repository.

Note that when a model is created, the URL is given in the console and
can be copied into a web browser to display the model.  The model ID
can also be extracted from this URL (it is the hash at the end of the URL).

Dial-A-Cluster (DAC) Models
---------------------------

To upload a DAC TDMS model, use

$ python dac_create_tdms_model.py data-file.TDM

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

$ python dac_create_tdms_models_batch tdms-batch-file.txt

where tdms-batch-file.txt is the .txt file containing the lines just 
described.

Depending on how many models are being created, it is helpful to
use the "--log_file" flag to specify a log file for recording any
errors in the upload process.