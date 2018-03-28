*Cars* Example Data Set
=======================

In the following sections, we will use the *cars* data set [#]_ to illustrate model creation and CCA in general.  *Cars* is not 
an ensemble of simulation data.  Instead, it is a list of features for 406 automobiles built between 1970 and 1982.  Selecting 
attributes which describe a car’s physical system and labeling them as inputs, while grouping the performance-based variables as outputs, we can see the relationships between design choices and various performance metrics.  Since CCA can only evaluate correlations between numeric variables, the analysis omits two columns, *Model* and *Origin*, which are string and categorical variables, respectively.  Also note that *Acceleration* is a variable measuring the number of seconds required to accelerate from 0 to 60 mph, so lower values represent greater acceleration.   

This data set provides an intuitive introduction to CCA because most people already have some idea of how a car’s manufacturing and 
performance features are related.  Increasing weight, displacement, and number of cylinders all represent larger engines, which are 
in turn correlated with greater horsepower, lower miles per gallon (MPG), and faster acceleration.  Due to the Arab oil embargos 
during the model years in this data set, engine sizes decreased over time to facilitate increased MPG.  

.. rubric:: Footnotes

.. [#] Donoho, D. and Ramos, E., *PRIMDATA: Data Sets for Use With PRIM-H*, http://lib.stat.cmu.edu/datasets/cars.desc and http://lib.stat.cmu.edu/datasets/cars.data (1982)
