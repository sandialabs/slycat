Canonical Correlation Analysis Model
====================================

Canonical Correlation Analysis (CCA) was first proposed by Hotelling in 1936 [#]_.  Because CCA finds correlations between two multivariate data sets, CCA data structures are a good fit for exploring relationships between the input and output variables found in ensemble data sets (such as those generated for sensitivity studies, uncertainty quantification, model tuning, or parameter studies).  Slycat™ uses CCA to model the many-to-many relationships between multiple input parameters and multiple output metrics.  CCA is a linear method and a direct generalization of several standard statistical techniques, including Principal Component Analysis (PCA), Multiple Linear Regression (MLR), and Partial Least Squares (PLS) [#]_ [#]_.

CCA operates on a table of scalar data, where each column is a single input or output variable across all runs, and each row consists of 
the values for each of the variables in a single simulation.  Slycat™ requires the number of rows (samples) to be greater than the minimum 
variable count of the inputs or the outputs.  A more meaningful result will be obtained if the ratio of runs to variables is ten or more. 
Additionally, columns cannot contain the same value for all runs.  Slycat™ will reject such columns from being included in the CCA 
analysis, since they contribute no differentiating information.  CCA cannot handle rows with missing data, Inf, -Inf, NAN, or NULL values. 
Slycat™ will remove rows from the analysis if any of the values in either the input or output variable sets include such data.  However, 
if the bad values are only in columns that are not analysis variables, the row will be used.

For a concise description of CCA, we need the following definitions.  Given *n* samples (*n* rows in the table), the input variables (presumed to be independent) will be referred to as the set *X* = {**x**\ :sub:`1`\ , …, **x**\ :sub:`n`\ } and the output (dependent) variables as the set *Y* = {**y**\ :sub:`1`\ , …, **y**\ :sub:`n`\ }.  Each vector **x**\ :sub:`i` has *p*\ :sub:`1` components and each vector **y**\ :sub:`j` has *p*\ :sub:`2` components.  CCA attempts to find projections **a** and **b** such that *R*\ :sup:`2` = corr (**a** T *X*, **b** T *Y*) is maximized, where corr (•,•) denotes the standard Pearson correlation. 

.. rubric:: Footnotes

.. [#] Hotelling, H., Relations Between Two Sets of Variates.  Biometrika, 28, 321-377 (1936).
.. [#] Adams, B.M., Ebeida, M.S., Eldred, M.S., Jakeman, J.D., Swiler, L.P., Bohnhoff, W.J., Dalbey,K.R., Eddy, J.P., Hu, K.T., Vigil, D.M., Bauman, L.E., and Hough, P.D., Dakota, a multilevel parallel object-oriented framework for design optimization, parameter estimation, uncertainty quantification, and sensitivity analysis: Version 5.3.1 user’s manual. Tech. Rep. SAND2010-2183, Sandia National Laboratories (2013).
.. [#] Ayachit, U., Bauer, A., Geveci, B., O’Leary, P., Moreland, K., Fabian, N., and Mauldin, J., ParaView Catalyst: Enabling In Situ Data Analysis and Visualization, Proceedings of the First Workshop on In Situ Infrastructures for Enabling Extreme-Scale Analysis and Visualization (ISAV2015), pp. 25-29, ACM, New York, NY (2015).
