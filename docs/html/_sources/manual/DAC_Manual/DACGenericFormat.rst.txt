.. _DACGenericFormat:

Dial-A-Cluster Generic Format
=============================

This is a multi-file format consisting of a zipped set of directories and comma separated value (CSV) files, where 
each directory provides a different type of information.  The CSV files are grouped using a naming convention that 
relies on file extensions to differentiate the data types: .dac, .meta, .var, .time, and .dist.  Other than the .dac 
file, which can have any name so long as it has a .dac extension, the names of the directories and all of the other 
files are fixed.  At the top level, there is the .dac file and three directories named *dist*, *time*, and *var*.  
The *dist* directory contains files named sequentially as variable_1.dist, variable_2.dist, …, variable\_\ *n*.dist, where 
*n* is the number of time series variables for each datapoint in the ensemble.  The *time* directory contains files 
variable_1.time, variable_2.time, …, variable\_\ *n*.time; and the *var* directory contains files variable_1.var, 
variable_2.var, …, variable\_\ *n*.var.  In addition, the *var* directory must contain the variables.meta file.  The 
directory structure is shown in Figure 2.

.. figure:: figures/dac-gen-zip-file-structure.png
   :scale: 55 %
   :align: center

   **Figure 2: The directory structure for the DAC generic input format, using a dataset with only three data points.**

.dac
----

Scalar data for the *Metadata Table* is contained in a single file with the .dac extension.  The first row contains 
header information (variable names) for the table columns.  The remaining rows are the values for these variables 
for each ensemble member.  Each row is comma separated and ends with a new line (a CSV file).  This file is at the 
same level as the directories *dist*, *time*, and *var*.

.dist
-----

In the *dist* folder, there are variable_1.dist, variable_2.dist, …, variable\_\ *n*.dist files.  Each .dist file contains 
the all-to-all distance matrix comparing every ensemble member to each of the others, calculated using the correspond 
time series variable.  These matrices are used to compute the visualization in the *Scatterplot* pane.  The file 
variable_1.dist is the distance matrix calculated using the first variable defined in variables.meta.  The .dist 
files have no header row.  Given *k* ensemble members, the file will consist of *k* rows, each with *k* comma-delimited 
distance values.  The rows and columns in these matrices are ordered according to order of the data points in the .dac file.

.time
-----

In the *time* folder, there are variable_1.time, variable_2.time, …, variable\_\ *n*.time files.  These files contain the 
times when the corresponding temporal variables were sampled.  For example the file variable_1.time contains the 
*x*-axis values for graphing the time sequence associated with the first variable in the variables.meta file.  These 
files have no header row, consisting of just a single row of comma delimited values.  The temporal units for these 
values are defined in the .meta file in the “Time Units” column.

.var
----

In the *var* folder, there are variable_1.var, variable_2.var, …, variable\_\ *n*.var files.  Here, the file variable_1.var 
contains the values (amplitudes in the *Time Series Plot*) for the first variable in the variables.meta.  The .var 
files have no header row, containing a single row with comma delimited values for each data point, ordered according 
to the order given in the .dac fille.  The units for these values are defined in the .meta file in the “Units” column.

.meta
-----

The *var* folder also contains a file variables.meta, which defines the time series variable names shown in the 
*Slider* panel.  The first row should consist of the headers: “Name,Time Units,Units,Plot Type”.  The remaining 
rows define each of the time series variables (one per row), providing variable name, units for labeling the x 
and y axes in the time series plots, and the type of plot.  “Curve” is the only option currently available for 
“Plot Type”.

.. _archiving-Windows:

Archiving in Windows
--------------------

The files and subdirectories described above must be archived in a .zip file before import into the DAC model 
creation wizard.  When creating the .zip file on Windows, do not zip from the level of an enclosing directory, 
but instead perform the zip with the three directories and the .dac file as the input elements.  Also note that 
all time sequences for a given temporal variable MUST contain an identical number of samples.  (Different time 
variables can have different number of samples, but the number of samples cannot vary within a specific variable.)  
The correct method for creating the archive is shown in Figure 3.

.. figure:: figures/compression-windows.png
   :align: center

   **Figure 3: Archiving a DAC Generic Format directory into a .zip file on Windows.**

.. _archiving-Mac:

Archiving on Mac
----------------

On a Mac, it is easiest to archive the files from the command line.  This avoids the inclusion of the Mac OS files 
.DS_store and __MACOSX, which will trigger errors when importing into the DAC model creation wizard.  From the 
directory containing the .dac file and the *dist*, *time*, and *var* folders, use the command::

$ zip -r weather-dac-gen.zip . -x ".*" -x "__MACOSX"

