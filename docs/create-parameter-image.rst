.. _Create a Parameter Image Model:

Create a Parameter Image Model
==============================

The Slycat *Parameter Image Model* associates images with feature vectors, and
would typically be used to explore the input parameters for an ensemble of
image-generating simulations.  For this type of model, you'll use one Python
script to synthesize image and parameter data in a format suitable for use with
Slycat, then import the data using the Slycat user interface.

Generate Image Data
-------------------

-  Within the Slycat Virtual Machine, use *Applications > System Tools >
   Terminal* to open a new shell.
-  Switch to the Slycat source code directory containing sample client
   scripts:

   ::

       $ cd src/slycat/web-client

-  Synthesize some parameter image data, organized for use with Slycat:

   ::

       $ python slycat-generate-parameter-image-model.py

-  The script creates an *images* directory containing a set of numbered image
   files, and an *images.csv* file that contains links to the images, plus
   randomly-generated numeric, string, and categorical parameters (the script
   includes optional command line parameters to control how much data is
   generated).  Now that you have some sample data, you're ready to pull it
   into Slycat.

Create a Project
----------------

-  Within the Slycat Virtual Machine, point a web browser to the Slycat
   web server at https://localhost:8092.
-  Click *Add New Project*, enter "Parameter Image Tutorial" as the project name, and
   click *Create Project*.
-  The browser switches to a separate page for the new project.

Ingest a Parameter Image Model
------------------------------

-  In the project page, click the *Remote PI* button. "Remote PI" is used
   ingest a file from a machine other than the host running the web
   browser.
-  In the *Remote File Parameter Image Model* wizard, enter "MyPI" as the model name
   and click *Next*.
-  In the login screen that follows, enter username "slycat" and password
   "slycat" and choose *Next*.  Note that these credentials will be used to SSH
   to another machine to load the parameter image data (in this case, the
   "other" happens to be localhost, but the Slycat server can be configured to
   connect to any other host that's accessible via SSH).
-  In the remote file browser that opens, select the
   *localhost//home/slycat/src/slycat/web-client/images.csv* file and click the
   *Next* button. This is the file that you generated in a previous step.
-  A list of the variables (columns) from the file appears, along with five
   columns of checkboxes, allowing you to designate each variable as in input,
   output, rating, categorical, or image variable.  Slycat trys to guess the
   types of the individual variables, but you will need to make some manual
   changes.  Use the checkboxes to designate "category0" and "category1" as
   Category variables, and "rating0" and "rating1" as Rating variables.  Change
   "output0", "output1", and "output2" to Output variables, and uncheck
   "unused0", "unused1", "unused2".  Click *Run*.
-  As we've already seen, the model is run, and the browser switches to
   a separate page for the new model once it's complete.

View a Parameter Image Model
----------------------------

-  The bottom third of the model page features a table containing the raw data
   used to compute the model. Input variables are color-coded green, output
   variables are color-coded purple, and the remaining variables are
   color-coded white.
-  The rest of the page contains a scatterplot with a point for each
   observation (row) in the data table.

Interact with a Parameter Image Model
-------------------------------------

-  Use the "X Axis" and "Y Axis" dropdown menus at the top of the display to
   use any two numeric variables for the scatterplot axes.
-  Click variable names in the raw data table or use the "Point Color" dropdown
   menu to color the scatterplot points using any numeric variable.
-  Hover over columns in the raw data table to reveal sorting widgets.
-  Click observations in the scatterplot to highlight the corresponding entry
   in the raw data table.
-  Click and drag in the scatterplot to rubber-band-select multiple
   observations.
-  Click rows or shift-click ranges of rows in the raw data table to highlight
   corresponding observations in the scatterplot.
-  Choose an image variable using the "Image Set" dropdown at the top of the
   display, then hover the mouse over observations in the scatterplot to see
   the corresponding images.
-  Click the "pin" icon in the upper-left-corner of an image to display it permanently.
-  Click the "close" icon in the upper-left-corner of a pinned image to close it.
-  Drag the "resize" icon in the lower-right-corner of a pinned image to resize it.
-  Click-and-drag anywhere else within a pinned image to reposition it on the page.
-  Click-and-drag the colorbar to reposition it on the page.
