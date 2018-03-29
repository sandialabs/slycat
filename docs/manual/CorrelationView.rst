Correlation View
================

The *Correlation View* displays the relationships found between variables when the ensemble is viewed holistically.  Each column
of the *Correlation View*’s bar chart represents a different canonical component.  These orthogonal components are ordered from 
left to right in decreasing importance, as shown by the decreasing R2 and increasing p-values in the first two rows of each 
component column.  Variable names are shown along the left edge with rows for input variables colored in green, and rows for output 
variables colored in lavender.  The number of components returned by CCA is equal to the minimum of the number of inputs versus the 
number of outputs.  So, for the example in Figure 23, where there are four inputs and three outputs, CCA will return three 
canonical components.  

