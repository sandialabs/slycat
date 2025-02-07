Push Scripts
============

DAC models can also be created using Python scripts that will push files up to
the Slycat server.  At present, these scripts are available only for TDMS data.

Installing slycat-web-client
^^^^^^^^^^^^^^^^^^^^^^^^^^^^

In order to use the push scripts, you must have Python installed on your computer,
and you must further install the slycat-web-client from https://pypi.org.  This
is accomplised using, for example:

.. code-block:: bash

    $ pip install slycat-web-client


If you are working behind a proxy, you might also need, e.g.

.. code-block:: bash

    $ pip install slycat-web-client --proxy your_proxy:your_port --trusted-host pypi.org

Creating a TDMS Model
^^^^^^^^^^^^^^^^^^^^^

If you are able to successfully install the slycat-web-client package, you can create
a model using the command line Python scripts ``dac_tdms`` or ``dac_tdms_batch``.

To upload a DAC TDMS model, use

.. code-block:: bash
    
    $ dac_tdms data-file.TDM

This will create a model from a single .TDM file.  You can also use .TDMS
files and .zip archives containing .tdms files.  The options available
for the creation of the models are the same as the options available using
the DAC model creation wizard in the browser.  To see the options use
the ``--help`` flag when calling the script.

In addition, a batch script is available for uploading multiple DAC TDMS
models.  To use this script, you must first create a file containing the
options for each model.  The file has the following format.

Line 1 contains the authentication information for the Slycat server that
you would pass to the ``dac_tdms`` script, but separated by commas.
For example,

.. code-block:: bash

    --user,smartin,--kerberos

If authentication information is unnecessary, just leave the line blank.

Line 2 contains the project information for the project that will contain
the DAC models to be created, e.g.

.. code-block:: bash

    --project-name,Batch TDMS Models

Line 2 can also be left blank.  It will default to "Batch TDMS Models".
Lines 3 and beyond contain the model information for each model, such as

.. code-block:: bash

    model-data-file-1.tdms,--model-name,Model 1
    model-data-file-2.tdms,--model-name,Model 2

Note that you must supply a model file (or multiple files) in accordance
with the ``dac_tdms`` script for each model.  Also note that if 
you want to put models into different projects, you can override the 
original project given in line 2, by using the ``--project-name`` flag 
again, e.g.

.. code-block:: bash

    model-data-file-n.tdms,--model-name,Model n,--project-name,Special Project

After the batch file has been created, you can call the TDMS batch 
processor to create your models using:

.. code-block:: bash

    $ dac_tdms_batch tdms-batch-file.txt

where tdms-batch-file.txt is the .txt file containing the lines just 
described.

Depending on how many models are being created, it is helpful to
use the ``--log_file`` flag to specify a log file for recording any
errors in the upload process.

If you are having problems using ``dac_tdms`` or ``dac_tdms batch``, it may be due
to authentication and/or proxy problems when trying to communicate to
the Slycat server.  These topics are described next.

User Authentication
^^^^^^^^^^^^^^^^^^^

The Slycat server requires user authentication.  The slycat.web.client
module provides the options for the authentication process.

For example, to use standard password authentication for a Slycat
server running on https://localhost:9000 without a security certificate,
use:

.. code-block:: bash

    $ python -m slycat.web.client.list_markings.py --user slycat --port 9000 --no-verify

Or, to access a Kerberos authenticated server running at slycat.sandia.gov,
use:

.. code-block:: bash

    $ python -m slycat.web.client.list_markings.py --host https://slycat.sandia.gov --kerberos

Kerberos
^^^^^^^^

The ``--kerberos`` option relies on a working Kerberos installation on your system.  Sometimes
this will fail.  If you get an error related to Kerberos credentials (e.g. "Couldn't find
Kerberos ticket," or "User not Kerberos authenticated"), try:

.. code-block:: bash

    $ kinit

Then re-run the original command.

Proxies/Certificates
^^^^^^^^^^^^^^^^^^^^

If you are separated from the Slycat server by a proxy, or have not set up a security
certificate, you will have to use the slycat.web.client proxy settings.  The proxy
settings are available using the flags:

* ``--http-proxy``
* ``--https-proxy``
* ``--verify``
* ``--no-verify``

The proxy flags are by default set to "no proxy".  If you have proxies set in the
environment variables, they will be ignored.  The proxy flags are used as follows
(for example):

.. code-block:: bash
    
    $ python -m slycat.web.client.list_markings.py --http-proxy http://your.http.proxy --https-proxy https://your.https.proxy

The ``--verify`` flag can be used to pass a security certificate as a command line argument and
the ``--no-verify`` flag can be used to ignore the security certificates altogether.

API
^^^

If you want to write your own push scripts, see the documentation for the slycat.web.client
package in :ref:`python-api`.