Push Scripts
============

DAC models can also be created using Python scripts that will push files up to the Slycat server.  These scripts are available using the SlyPI package.  For information about Slypi and instructions on installation see :ref:`slypi-ref-label`.

Creating a TDMS Model
^^^^^^^^^^^^^^^^^^^^^

Using the SlyPI package, you can create a DAC model using the command line Python scripts ``dac_tdms`` or ``dac_tdms_batches``.

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
the Slycat server.  See :ref:`slypi-ref-label` for more information.
