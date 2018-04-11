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
