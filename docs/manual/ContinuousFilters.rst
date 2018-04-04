Continuous Filters
------------------

.. figure:: Figure30.png
   :align: center
   
   **Figure 30: Entire variable range initially visible in slider.**
   
The first time a filter is used, the entire range of the variable is visible (drawn in blue), as in Figure 30.  The maximum 
and minimum variable values are at the top and the bottom of the filter, while the max/min values for the visible range are 
shown next to the slider endpoints.  These max/min values interactively track the slider endpoints, changing both the value 
and position.  The excluded portions of the range appear in gray, as demonstrated in Figure 31, where the maximum value has 
been dragged down to 268 and the minimum value has been pulled up to 166.  In addition to grabbing and dragging the endpoints, 
you can drag the visible range as a unit, creating a sliding window of fixed length.  The scatterplot and table are only 
redrawn when you stop moving the mouse or release the button.

.. figure:: Figure31.png
   :align: center
   
   **Figure 31: Slider after dragging adjusting Displacement max/min values.**
   
Sometimes the resolution of slider increments can be a problem.  The values associated with the set of unique slider positions 
may not include the value that you want to use as your threshold.  So, the minimum and maximum threshold values are editable.  
To edit the threshold extrema, hover over the value (which will then turn orange as in Figure 32), type in the new value, and 
hit enter.

.. |DeleteIcon| image:: DeleteIcon.png
