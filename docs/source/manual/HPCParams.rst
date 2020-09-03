High Performance Computing Parameters Dialog
--------------------------------------------

The *HPC Parameters* screen is specific to your institution.  Figure 53 shows the parameters for Sandia’s cluster systems.  
Other than differences in the list of steps shown along the top, the same screen is used for all three data formats (*Xyce*, 
*CSV*, and *HDF5*).  

.. figure:: Figure53.png
   :scale: 75
   :align: center
   
   **Figure 53: HPC Parameters for Sandia clusters.**
   
*WCID* stands for Workload Characterization ID, which is required for job submission on the clusters.  Because Slycat™ uses 
parallel processing to speed up Time Series model creation, users are required to have obtained a *WCID* prior to creating a 
Time Series model.  Your *WCID* is associated with an Strategic Management Unit/Program Management Unit (SMU/PMU), which is 
used to specify the *Partition* or queue-name.  At Sandia, the choices are *nw*, *ec*, *dsa*, *ihns*, *ldrd*, *cee*, *viz*, or 
*viz batch*).

