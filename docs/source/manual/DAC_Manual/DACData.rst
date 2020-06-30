Data Formats
============

There are currently three data formats accepted by DAC, the Dial-A-Cluster Generic Format, the PTS CVS/META Zip Format, 
and a National Instruments (http://www.ni.com) LabView based TDMS format.

Dial-A-Cluster Generic Format
-----------------------------

This is a multi-file format consisting of a zipped set of directories and comma separated value (CSV) files, where 
each directory provides a different type of information.  The CSV files are grouped using a naming convention that 
relies on file extensions to differentiate the data types: .dac, .meta, .var, .time, and .dist.  Other than the .dac 
file, which can have any name so long as it has a .dac extension, the names of the directories and all of the other 
files are fixed.  At the top level, there is the .dac file and three directories named *dist*, *time*, and *var*.  
The *dist* directory contains files named sequentially as variable_1.dist, variable_2.dist, …, variable_n.dist, where 
n is the number of time series variables for each datapoint in the ensemble.  The *time* directory contains files 
variable_1.time, variable_2.time, …, variable_n.time; and the *var* directory contains files variable_1.var, 
variable_2.var, …, variable_n.var.  In addition, the *var* directory must contain the variables.meta file.  The 
directory structure is shown in Figure 2.


