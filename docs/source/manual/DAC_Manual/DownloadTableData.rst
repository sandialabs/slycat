.. _DownloadDataTable:

Download Data Table |Download|
==============================

.. |Download| image:: icons/download.png

Clicking the |Download| icon when no points are selected saves the contents of the entire *Metadata Table* as a CSV file.  However, 
if you have selected points, clicking |Download| brings up the dialog shown in Figure 19, letting you choose between saving the 
full *visible* table or just the *visible* selected points.  

It is important to note that the *visible* table is the table that you see after application of the table filters (see 
:ref:`TableFiltering` in :ref:`MetadataTable`).  When you export the full *visible* table, you are export the table after the filters 
have been applied, but regardless of whether or not ensemble members are selected.  If you want to export the entire table, 
you must first clear the table filters before clicking the |Download| icon.  Similarly, when you export the *visible* selection, 
you are exporting only selections visible after the filters have been applied.  And again, if you want to export all selections, 
regardless of the table filters, you must first clear the filters.

.. figure:: figures/export-table-data.png
   :scale: 40 %
   :align: center

   **Figure 19: Export Table Data dialog.**
