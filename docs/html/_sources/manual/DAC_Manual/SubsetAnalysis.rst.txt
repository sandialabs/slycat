.. _SubsetAnalysis:

Subset Analysis |SubsetIcon|
============================

.. |SubsetIcon| image:: icons/subset-icon.png
   :scale: 50 %

.. |SubsetIcon2| image:: icons/subset-icon.png
   :scale: 40 %

.. |SubsetIconYellow| image:: icons/subset-icon-yellow.png
   :scale: 80 %

If you want to restrict your analysis to a subset of the points, click the |SubsetIcon2| icon (as shown in Figure 28), then select a 
point subset by a click-and-drag rubber-band operation to generate a shaded rectangular region that encompasses the desired points.  
Releasing the mouse button completes the selection, regenerates the MDS projection based on the reduced point set, and redraws the 
scatterplot.  The icon is now yellowed |SubsetIconYellow|, indicating that the currently rendered scatterplot is a subset.  Click 
anywhere in the background to return to the full point set.

Alternatively, a point or points may be excluded from the subset by holding the shift key and then clicking on the point that is to be 
excluded.  Multiple points may be excluded by holding the shift key while using rubber-band operation.

.. figure:: figures/subset.png
   :scale: 60 %
   :align: center

   **Figure 28: Subset icon.**

Only points in the current analysis subset will appear in the *Time Series Plot* views, so the number of lines may be reduced if some 
of the originally selected points have been excluded.  In addition, set membership (in the *red*, *blue*, and *green* groups) is limited 
to only the points in the current analysis, so after taking a subset, set membership is lost for any points outside the subset. Even after 
returning to the full point set (by clicking on the background) the reduced selections will be in effect.  Further, while the analysis 
is in subset mode, any rows in the *Metadata Table* that correspond to excluded points are grayed out and non-interactive.
