.. _Create a Timeseries Model:

Create a Timeseries Model
=========================

The Slycat *Timeseries Model* provides time series analysis based on
clustering and comparative visualization of waveforms. However, unlike
:ref:`Creating a CCA Model <Create a CCA Model>`, you can't upload
data for a Timeseries model using your web browser. Instead, you'll use
one Python script to synthesize some time series data in a format
suitable for use with Slycat, and a second script to compute the model
and push it to the Slycat Web Server. This will demonstrate how Slycat's
:ref:`RESTful API` can be used to control Slycat programmatically, so you
can transform and upload your data using any language that supports HTTP
networking.

Generate Timeseries Data
------------------------

-  Within the Slycat Virtual Machine, use *Applications > System Tools >
   Terminal* to open a new shell.
-  Switch to the Slycat source code directory containing sample client
   scripts:

   ::

       $ cd src/slycat/web-client

-  The script for synthesizing data is designed to run in parallel, so
   start some parallel worker processes in the background:

   ::

       $ ipcluster start --daemonize

-  Synthesize some time series data, organized for use with Slycat:

   ::

       $ python slycat-generate-hdf5-timeseries.py mydata

-  The script creates a *mydata* directory and populates it with a set
   of random input variables and ten output time series, each containing
   two variables (additional command line parameters are available to
   synthesize data of arbitrary size).

Compute a Timeseries Model
--------------------------

-  Now that you have some sample data, run
   *slycat-hdf5-to-timeseries-model.py*, entering the password "slycat"
   when prompted (this script also runs in parallel, using the workers
   you started previously):

   ::

       $ python slycat-hdf5-to-timeseries-model.py mydata
       slycat password: 
       INFO - Storing clustering parameters.
       INFO - Storing input table attribute 0
       INFO - Storing input table attribute 1
       INFO - Storing input table attribute 2
       ...
       INFO - Your new model is located at https://localhost:8092/models/...

View a Timeseries Model
-----------------------

-  Point your web browser to the Slycat home page at
   https://localhost:8092 again. Wait for the model icon in the *Worker
   Pane* to switch to a green check, if it hasn't already.
-  Note that the push script created a new project, "HDF5-Timeseries".
   Click on the project's name, and the browser opens the project page.
-  In the project page, note that there is a new model entry named "my
   data". Click on on the model's name, and the browser opens the
   timeseries page.
-  At the top of the page there is a list of output variables.
-  At page left is a hierarchical clustering of the output variable
   timeseries, displayed as a dendrogram.
-  At page right the raw output timeseries are plotted.
-  At the bottom of the page is a table containing raw input data.

Interact with a Timeseries Model
--------------------------------

-  Click on an output variable name at the top of the page to select
   that output, updating the rest of the interface.
-  Click variable names in the raw input table to color timeseries using
   that variable.
-  Click individual raw input table rows or shift-click ranges of rows
   to highlight the corresponding timeseries.
-  Click nodes in the dendrogram to display only those waveforms.
-  Double-click nodes in the dendrogram to expand / collapse their
   children.

Next Steps
----------

Next, let's move on to :ref:`Create a Parameter Image Model`.
