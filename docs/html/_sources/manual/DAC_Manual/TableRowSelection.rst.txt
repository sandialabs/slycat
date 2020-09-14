.. _TableRowSelection:

Table Row Selection
===================

.. |SelectSet2| image:: icons/select-set.png
   :scale: 80 %

As in the case of the *Scatterplot*, ensemble members can be selected via the *Metadata Table*.  The selection color 
is controlled by the color selection icons |SelectSet2| above the *Scatterplot*.  If none of the color selection icons are active, 
selections are not recognized.  If a selection icon is active, there are a few different ways to select rows in the 
*Metadata Table*.  First, if a selection is empty, simply clicking on a row will select that ensemble member.  The 
corresponding point in the *Scatterplot* will be show in the selected color and the corresponding time series will be 
added to the *Time Series Plots*.  This action is shown in Figure 35.

.. figure:: figures/select-one-row.png
   :align: center

   **Figure 35: Single row selection from Metadata Table.**

Second, if a selection is not empty, another ensemble member can be added by clicking on the new row to bring it into focus 
(indicated by a black box drawn around the row -- see :ref:`TableFocusSelection`), then using the shift key while clicking 
on the new row.

Third, to select a range from the *Metadata Table*, mark the start of the range by clicking on a row to bring it into focus, 
then holding the shift key while clicking on the end of the desired range.

Finally, we note that if using a subset of the dataset (see :ref:`SubsetAnalysis`), rows not in the subset will be highlighted 
in gray, and will not be available for selection or focus.

