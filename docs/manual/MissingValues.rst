Missing Values
--------------

.. figure:: Figure35.png
   :align: center
   
   **Figure 35: Filtering normally excludes points with missing values.**
   
When filtering is performed on a variable where there are missing or non-defined data values (e.g. NULLs, NANs, Inf, -Inf), 
such as the *Horsepower* variable in Figure 35, those points corresponding to missing data are eliminated, as they are undefined 
and therefore not part of the range.  This presents a problem if you want to compare points with missing data to points from a 
subset of that variable’s value range.  The |NULLIcon| icon at the bottom of each filter enables the inclusion of points with 
missing data relative to that variable into the scatterplot.  When a filter is first instantiated, the missing values are 
filtered out and the |NULLIconOff| icon is gray.  Click |NULLIconOff| to make those points visible, as shown in Figure 36.  The 
icon acts as a toggle, so clicking |NULLIcon| will hide those points again.

.. |NULLIcon| image:: NULLIcon.png
.. |NULLIconOff| image:: NULLIconOff.png

   
.. figure:: Figure36.png
   :align: center
   
   **Figure 36: Filter plus missing-valued points.**
