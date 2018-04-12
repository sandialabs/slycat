Time Series Parameters Dialog
-----------------------------

The next screen of the wizard will depend on which data format you selected.  If you selected *Xyce* or *CSV*, the next screen 
will be a file browser on the remote host.  Navigate to the location of the ensemble data table (a *dakota_tabular* file within 
the directory hierarchy described above for *Xyce* inputs, or a *CSV* file containing full paths to each time series file for 
*CSV* inputs).  Navigation is identical to that described in the earlier section on Remote Files. Click on the data table file 
in the remote file browser to select it, then click *Continue*.  If you selected *HDF5*, the wizard skips this step since there 
is no need to select a table file.

.. figure:: Figure50.png
   :scale: 75
   :align: center
   
   **Figure 50: Timeseries Parameters for Xyce data sets.**
   
For all three input types, the next step is setting the parameters to be used for binning and clustering the time series.  
*Xyce*, *CSV*, and *HDF5* have slightly different interfaces for this step, which are shown in Figure 50, Figure 51, and 
Figure 52, respectively.  

.. figure:: Figure51.png
   :scale: 75
   :align: center
   
   **Figure 51: Timeseries Parameters for CSV data sets.**
   
.. figure:: Figure52.png
   :scale: 75
   :align: center
   
   **Figure 52: Timeseries Parameters for HDF5 data sets.**
   
The *CSV* screen includes two additional fields that are not needed by the other formats, *Table File Delimiter* and 
*Timeseries Column Name*.  *Table File Delimiter* allows you to use other delimiters besides commas in the data table, such 
as *tabs* or *spaces*.  *Tabs* are difficult to specify because the web interface uses *tabs* to move between fields, but if 
you cut-and-paste a *tab* into the field, enclosing it with single quotes, Slycat™ will accept a tab-delimited table.  To 
designate a *space* as a delimiter, enclose it with single quotes, since otherwise the field is interpreted as being empty.  
*Commas* do not require quotes.  

Since *CSV* data tables can have multiple columns of time series data (e.g. if you sampled a set of variables over time at 
various locations within the simulation), the *Timeseries Column Name* identifies which time series data set to analyze.  
Type in the column name, taking care to exactly match the header as it appears in the table.  

The remaining parameters are shared by all three input types.  *Timeseries Bin Count* controls how finely the time series 
is sampled.  The resulting binned sequences are used for calculating similarities and the reduced representations are drawn 
in the model visualization.  Generally, bin counts between 500 and 1000 produce a reasonable tradeoff between speed and 
accuracy.  Although increasing the number of bins increases both the analysis and rendering times, a greater bin count also 
helps preserve spikes or other localized features that could be lost when using a smaller number.  

The *Resampling Algorithm* dropdown has two options.  Both algorithms use a uniform set of bins, with the choice between 
using *uniform piecewise linear approximation* or *uniform piecewise aggregate approximation* as the resampling method.  
*Uniform piecewise aggregate approximation* is the default.

The *Cluster Linkage Measure* dropdown selects the metric used when evaluating distance between groups of elements.  There 
are four choices: 

•	*single: Nearest Point Algorithm*
•	*complete: Farthest Point Algorithm*
•	*average: Unweighted Pair Group Method with Arithmetic Mean (UPGMA) Algorithm*
•	*weighted: Weighted Pair Group Method with Arithmetic Mean (WPGMA) Algorithm*

*Single* evaluates the distance using the closest elements/minimum linkage; *complete* uses the farthest elements/maximum 
linkage; *average* uses the distance between the group averages; and *weighted* uses the values from the distance matrix.  
*Average* is the default.  We are using SciPy to perform the clustering, so a more complete description of the linkage 
choices can be found at https://docs.scipy.org/doc/scipy/reference/generated/scipy.cluster.hierarchy.linkage.html.

The *Cluster Metric* currently only has a single choice, *Euclidean*, so it cannot be changed (hence the field is grayed 
out).  This field is provided to inform you that we are using Euclidean distances in our algorithms.

Once you are satisfied with these parameter choices, click *Continue* to go to the next screen.
