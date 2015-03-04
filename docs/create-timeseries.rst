.. _create-timeseries-model:

Create a Timeseries Model
=========================

The Slycat *Timeseries Model* provides time series analysis based on
clustering and comparative visualization of waveforms. However, unlike
:ref:`Creating a CCA Model <create-cca-model>`, you can't upload
data for a Timeseries model using your web browser. Instead, you'll use
one Python script to synthesize some time series data in a format
suitable for use with Slycat, and a second script to compute the model
and push it to the Slycat Web Server. This will demonstrate how Slycat's
:ref:`rest-api` can be used to control Slycat programmatically, so you
can transform and upload your data using any language that supports HTTP
networking.

Generate Timeseries Data
------------------------

* For this example we'll ssh into the Slycat Docker container, where the scripts
  to be run are already installed.  Normally, you would run these scripts on the
  system where your data was located::

  $ ssh slycat@<docker host ip> -p2222

In this case, substitute your docker host IP address.  If you're running
docker on a Linux host, this will be `localhost`.  On systems using
Boot2Docker, it will be the IP address returned by::

  $ boot2docker ip

When prompted, enter password `slycat`.

* Switch to the Slycat source code directory containing the sample client
  scripts::

  $ cd src/slycat/web-client

* The script for synthesizing data is designed to run in parallel, so
  start some parallel worker processes in the background::

  $ ipcluster start --daemonize

* Synthesize some time series data, organized for use with Slycat::

  $ python slycat-create-sample-timeseries-hdf5.py

* The script creates a *sample-timeseries* directory and populates it with a set
  of random input variables and ten output time series, each containing
  two variables (additional command line parameters are available to
  synthesize data of arbitrary size).

Compute a Timeseries Model
--------------------------

* Now that you have some sample data, run::

    $ python slycat-create-timeseries-model-from-hdf5.py --no-verify sample-timeseries

  and enter the password `slycat`
  when prompted (this script also runs in parallel, using the workers
  you started previously)::

    slycat password:
    INFO - Storing clustering parameters.
    INFO - Storing input table attribute 0
    INFO - Storing input table attribute 1
    INFO - Storing input table attribute 2
    ...
    INFO - Your new model is located at https://localhost:8092/models/...

View a Timeseries Model
-----------------------

* Point your web browser to the Slycat home page at
  https://<docker host ip>, if it isn't already.
* In the Slycat navbar at the top of
  the page, you should see a gray status dropdown containing two numbers
  separated by a slash.  Those numbers are the number of models being
  computed, and the number of recently completed models, respectively.
* Click on the status dropdown to see a menu containing an entry for
  all in-progress and recently completed models.
* Wait for the *sample-timeseries* model to be a completed (a green
  check appears to its left), if it hasn't already.
* Click the *sample-timeseries* entry in the status dropdown,
  and the browser opens the new model page.
* At the top of the page there is a list of output variables.
* At page left is a hierarchical clustering of the output variable
  timeseries, displayed as a dendrogram.
* At page right the raw output timeseries are plotted.
* At the bottom of the page is a table containing raw input data.

Interact with a Timeseries Model
--------------------------------

* Click on an output variable name at the top of the page to select
  that output, updating the rest of the interface.
* Click variable names in the raw input table to color timeseries using
  that variable.
* Click individual raw input table rows or shift-click ranges of rows
  to highlight the corresponding timeseries.
* Click nodes in the dendrogram to display only those waveforms.
* Double-click nodes in the dendrogram to expand / collapse their
  children.

Next Steps
----------

Next, let's move on to :ref:`create-parameter-image-model`.
