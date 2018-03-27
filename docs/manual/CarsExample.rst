*Cars* Example Data Set
=======================

In the following sections, we will use the *cars* data set to illustrate model creation and CCA in general.  *Cars* is not an 
ensemble of simulation data.  Instead, it is a list of features for approximately 400 automobiles built between 1970 and the early 
1980’s.  Selecting attributes which describe a car’s physical system and labeling them as inputs, while grouping the 
performance-based variables as outputs, we can see the relationships between design choices and various performance metrics.  Since 
CCA can only evaluate correlations between numeric variables, the analysis omits two columns, *Model* and *Origin*, which are 
string and categorical variables, respectively.  Also note that *Acceleration* is a variable measuring the time required to reach a 
specific speed, so lower values represent greater acceleration.   

This data set provides an intuitive introduction to CCA because most people already have some idea of how a car’s manufacturing and 
performance features are related.  Increasing weight, displacement, and number of cylinders all represent larger engines, which are 
in turn correlated with greater horsepower, lower miles per gallon (MPG), and faster acceleration.  Due to the Arab oil embargos 
during the model years in this data set, engine sizes decreased over time to facilitate increased MPG.  
