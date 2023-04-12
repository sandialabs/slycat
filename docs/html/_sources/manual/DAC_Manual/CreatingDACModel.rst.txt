Model Creation
==============

To create a DAC model within Slycat™, click the green *Create* button in the Navbar while you are on a project page.  
A dropdown menu will appear as shown in Figure 4.  Note that DAC models are only generated from data sets stored locally 
on your desktop machine, or on a shared disk accessible from your desktop.  Unlike other Slycat™ models, there is no 
remote data option for ingestion of data sets stored on a cluster.

.. figure:: figures/create-new-model-highlighted.png
   :scale: 50 %
   :align: center

   **Figure 4: Model creation dropdown menu.  Click on New Dial-A-Cluster Model to start the DAC model creation wizard.**

Select *New Dial-A-Cluster Model*, which will start the DAC model creation wizard.  The wizard takes you through a series 
of choices regarding the input data format, location, and model name, each of which appears in a separate tab of the 
wizard’s popup window.  

.. toctree::
  :maxdepth: 1

  DACInputFormats.rst
  NameModel.rst
  LoadData.rst
  ModelParseLog.rst
  PushScripts.rst
