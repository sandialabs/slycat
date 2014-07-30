.. _Create a CCA Model:

Create a CCA Model
==================

In Slycat, we perform an analysis by ingesting data and creating a
*model*. One type of Slycat model is *Canonical Correlation Analysis
(CCA)*, used to model relationships between a set of input and output
metrics. Before creating a CCA model however, we must create a
*project*, which is used to organize and control access to models.

Create a Project
----------------

-  Within the Slycat Virtual Machine, point a web browser to the Slycat
   web server at https://localhost:8092.
-  Click *Add New Project*, enter "MyProject" as the project name, and
   click *Create Project*.
-  The browser switches to a separate page for the new project.

Generate a CCA Model
--------------------

-  In the project page, click the *Local CCA* button. Local CCA is an
   analysis performed on a file uploaded from (i.e. local to) the web
   browser.
-  In the *Local File CCA Model* wizard, enter "MyCCA" as the model name
   and click *Next*.
-  Choose the */home/slycat/src/slycat/data/cars.csv* file and click the
   *Next* button. This file contains data describing 406 different types
   of automobile in CSV format.
-  A list of the variables (columns) from the uploaded file appears,
   along with two columns of checkboxes, allowing you to designate each
   variable as in input, an output, or neither. Use the checkboxes to
   select "Cylinders", "Displacement", "Weight", and "Year" as inputs,
   and "MPG", "Horsepower", and "Acceleration" as outputs. Uncheck
   "Origin".
-  Leave the "Scale inputs to unit variance." checkbox checked, and
   click *Next*.
-  A popup window appears, letting you know that model generation has
   begun.

Wait for Model Completion
-------------------------

-  The time to compute models can vary from seconds to days, depending
   on the complexity of the model and the data. For this reason, Slycat
   computes models in the background, allowing you to:

   -  Continue interacting with existing projects and models.
   -  Create more than one model at a time.
   -  Cancel computation for unwanted models.

-  To help you keep track of multiple models in varying states of
   completion, Slycat provides a *Worker Pane* across the top of the
   browser window, where each active model appears as an icon:

   -  Models that are being computed will have a gear icon or a circular
      progress bar icon.
   -  Models that completed successfully will have a green check icon.

View a CCA Model
----------------

-  Wait for the model icon in the Worker Pane to become a green
   checkmark. Hover over the icon to reveal a small popup and click the
   *View* link. The browser will switch to a separate page containing
   the new model.
-  The bottom half of the model page features a table containing the raw
   data used to compute the model. Input variables are color-coded
   green, output variables are color-coded purple, and unused variables
   are color-coded white.
-  The upper-left corner of the page contains the CCA table, a
   high-level overview of the CCA results including statistical
   significance measures and bar-plots for each input and output
   variable over three CCA components.
-  The upper-right corner of the page contains a scatterplot detailing
   how well each individual observation in the raw data fits the
   currently selected CCA component.

Interact with a CCA Model
-------------------------

-  Click a component name ("CCA1", "CCA2", or "CCA3") in the CCA table
   to select that component, displaying its bar plot and updating the
   scatterplot.
-  Click variable names in the CCA table or the raw data table to color
   code observations with that variable.
-  Hover over columns in the CCA table and the raw data table to reveal
   sorting widgets.
-  Click observations in the scatterplot to highlight the corresponding
   entry in the raw data table.
-  Click and drag in the scatterplot to rubber-band-select multiple
   observations.
-  Click rows or shift-click ranges of rows in the raw data table to
   highlight corresponding observations in the scatterplot.

Next Steps
----------

Now that you've created your first CCA model it's time to :ref:`Create a Timeseries Model`.
