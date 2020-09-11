Derived Models
==============

On occasion, users may want to add additional ensemble members to an already loaded model, or even change the time 
series data in a model.  This cannot be done in general, but it can be done in two specific cases.  In the first case, 
a number of models can be combined to create a new model.  In the second case the time series axis for different variables 
can be reduced, and a new model can be computed based on the restricted time series data.

.. toctree::
   :maxdepth: 1

   CombiningModels.rst
   TimeFilteredModels.rst

