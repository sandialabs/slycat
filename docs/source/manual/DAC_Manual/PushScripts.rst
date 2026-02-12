Push Scripts
============

DAC models can also be created using Python scripts that will push files up to
the Slycat server.  These scripts are available using the SlyPI package.  For a
more detailed description of SlyPI, see:

* https://slypi.readthedocs.io/en/latest/
* https://pypi.org/project/slypi/
* https://github.com/sandialabs/slypi

Installing SlyPI
^^^^^^^^^^^^^^^^

In order to use the push scripts, you must have Python installed on your computer,
and you must further install SlyPI from https://pypi.org.  This
is accomplised using, for example:

.. code-block:: python

    pip install slypi


If you are working behind a proxy, you might also need, e.g.

.. code-block:: python

    pip install slypi --proxy your_proxy:your_port --trusted-host pypi.org

Creating a TDMS Model
^^^^^^^^^^^^^^^^^^^^^

If you are able to successfully install the SlyPI package, you can create
a model using the command line Python scripts ``dac_tdms`` or ``dac_tdms_batches``.

To upload a DAC TDMS model, use

.. code-block:: python
    
    dac_tdms data-file.TDM

This will create a model from a single .TDM file.  You can also use .TDMS
files and .zip archives containing .tdms files.  The options available
for the creation of the models are the same as the options available using
the DAC model creation wizard in the browser.  To see the options use
the ``--help`` flag when calling the script.

In addition, the script ``dac_tdms_batches`` is available for uploading multiple 
DAC TDMS models.  To use this script, you must specify multiple .TDMS files using,
for example, a format specifier

.. code-block:: python

    dac_tdms_batches --input-tdms-batches "/data/" 123123_04 50

Depending on how many models are being created, it is helpful to
use the ``--log_file`` flag to specify a log file for recording any
errors in the upload process.

If you are having problems using ``dac_tdms`` or ``dac_tdms batches``, it may be due
to authentication and/or proxy problems when trying to communicate to
the Slycat server.  These topics are described next.

User Authentication
^^^^^^^^^^^^^^^^^^^

The Slycat server requires user authentication.  The slypi
module provides the options for the authentication process.

For example, to use standard password authentication for a Slycat
server running on https://localhost:9000 without a security certificate,
use:

.. code-block:: python

    python -m slypi.util.list_markings.py --user slycat --port 9000 --no-verify

Or, to access a Kerberos authenticated server running at slycat.sandia.gov,
use:

.. code-block:: python

    python -m slypi.util.list_markings.py --host https://slycat.sandia.gov --kerberos

Kerberos
^^^^^^^^

The ``--kerberos`` option relies on a working Kerberos installation on your system.  Sometimes
this will fail.  If you get an error related to Kerberos credentials (e.g. "Couldn't find
Kerberos ticket," or "User not Kerberos authenticated"), try:

.. code-block:: python

    kinit

Then re-run the original command.

Proxies/Certificates
^^^^^^^^^^^^^^^^^^^^

If you are separated from the Slycat server by a proxy, or have not set up a security
certificate, you will have to use the slypi proxy settings.  The proxy
settings are available using the flags:

* ``--http-proxy``
* ``--https-proxy``
* ``--verify``
* ``--no-verify``

The proxy flags are by default set to "no proxy".  If you have proxies set in the
environment variables, they will be ignored.  The proxy flags are used as follows
(for example):

.. code-block:: python

    python -m slypi.util.list_markings.py --http-proxy http://your.http.proxy --https-proxy https://your.https.proxy

The ``--verify`` flag can be used to pass a security certificate as a command line argument and
the ``--no-verify`` flag can be used to ignore the security certificates altogether.

API
^^^

If you want to write your own push scripts, see the documentation for 
SlyPI at https://slypi.readthedocs.io/en/latest/.