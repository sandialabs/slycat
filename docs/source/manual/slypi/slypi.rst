.. _slypi-ref-label:

SlyPI Library
=============

The Slycat Python Interface (SlyPI) is a tool developed to assist in automating the creation of Slycat models.  It includes code that enables you to interact with the Slycat web server through a Python interface. You can query the Slycat server, create Slycat models, and use the code to integrate your own algorithms into the Slycat pipeline.

Here we provide a brief introduction to SlyPI.  For additional documentation see :ref:`slypi-further-information`.

Installing SlyPI
^^^^^^^^^^^^^^^^

In order to use the push scripts, you must have Python installed on your computer,
and you must further install SlyPI from https://pypi.org/project/slypi/.  This
is accomplised using, for example:

.. code-block:: python

    pip install slypi


If you are working behind a proxy, you might also need, e.g.

.. code-block:: python

    pip install slypi --proxy your_proxy:your_port --trusted-host pypi.org

User Authentication
^^^^^^^^^^^^^^^^^^^

The Slycat server may require user authentication.  The slypi module provides options for the authentication process.

For example, to use standard password authentication for a Slycat server running on https://localhost:9000 without a security certificate, use:

.. code-block:: python

    python -m slypi.util.list_markings.py --user slycat --port 9000 --no-verify

Or, to access a Kerberos authenticated server running at slycat.datacats.org,
use:

.. code-block:: python

    python -m slypi.util.list_markings.py --host https://slycat.datacats.org --kerberos

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

SlyPI Examples 
^^^^^^^^^^^^^^

Following are a couple of examples using SlyPI to create Slycat models.

CCA Model
"""""""""

To create a sample CCA model from a CSV file, use:

.. code-block:: bash

    python -m slypi.cca.upload_csv slycat-data/cars.csv --input Cylinders Displacement Weight Year --output MPG Horsepower Acceleration --project-name "CCA Models"

where "slycat-data/cars.csv" is from the slycat-data git repository at https://github.com/sandialabs/slycat-data.

Note that when a model is created, the URL is given in the console and can be copied into a web browser to display the model. The model ID can also be extracted from this URL (it is the hash at the end of the URL).

Parameter Space Model
"""""""""""""""""""""

SlyPI also provides a programmatic interface for creating models.  To create
a Parameter Space model from a python script, use the SlyPI module as follows:

.. code-block:: python
        
    import slypi.ps.upload_csv as ps_upload_csv

    # parameter space file
    CARS_FILE = ['../slycat-data/cars.csv']

    # input/output columns for cars data file
    CARS_INPUT = ['--input-columns', 'Model', 'Cylinders', 'Displacement', 'Weight', 'Year']
    CARS_OUTPUT = ['--output-columns', 'MPG', 'Horsepower', 'Acceleration']

    # create PS model from cars file
    ps_parser = ps_upload_csv.parser()
    arguments = ps_parser.parse_args(CARS_FILE + CARS_INPUT + CARS_OUTPUT)
    ps_upload_csv.create_model(arguments, ps_upload_csv.log)

More Advanced Usage
^^^^^^^^^^^^^^^^^^^

In addition to using SlyPI to create Slycat models, SlyPI can also:

* interact with the Slycat server to query projects, models, and user authentication information;
* manage the numerous files generated when creating an ensemble of numerical simulations;
* perform dimension reduction and other analysis methods on datasets;
* be extended with user defined algorithms and data formats.

.. _slypi-further-information:

Further Information
^^^^^^^^^^^^^^^^^^^

* Documentation: https://slypi.readthedocs.io/en/latest/
* Pip Installable Package: https://pypi.org/project/slypi/
* Code Repository: https://github.com/sandialabs/slypi