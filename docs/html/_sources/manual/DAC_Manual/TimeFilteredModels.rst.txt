Time Filtered Models
====================

The second option for altering data in a pre-existing model is the restriction of the time axis in the *Time Series Plots*.
Such restrictions, however, also alter between curve similarity values, making it necessary to re-compute the coordinates 
in the *Scatterplot*.  Therefore, restricting the time axis values in the *Time Series Plots* requires the creation of a 
new, derived model.  To create a time filtered derived model, select Create > Time Filtered Model, as shown in Figure 47.  
As with combined model creation, this must be done from within an existing model.

.. figure:: figures/create-time-filtered.png
   :scale: 50 %
   :align: center

   **Figure 47: Pulldown menu for creating a time filtered model.**

The time filtered model creation wizard consists of two dialogs.  The first dialog is shown in Figure 48.  In this dialog, 
simply adjust the sliders for a given time series plot to the desired range.  After the desired restrictions have been 
performed, push the *Continue* button.  To return the ranges to their full available values, push the *Reset* button.


.. figure:: figures/time-filters-1.png
   :scale: 40 %
   :align: center

   **⋮**

.. figure:: figures/time-filters-2.png
   :scale: 40 %
   :align: center

   **Figure 48: Time filtered creation wizard.  Sliders allow the user to restrict any given time axis.**

As in the combined model wizard, the final dialog allows you to name and mark the new time filtered model.  This is done in 
the same way that new models are named (see :ref:`NameModel`).  After naming the model, an indicator and accompanying message box 
will be presented to show progress and any problems making the time filtered model (see :ref:`LoadingDataAndProgressIndicators`).
