Canonical Correlation Analysis Model
====================================

Canonical Correlation Analysis (CCA) was first proposed by Hotelling in 1936 [#]_.  Because CCA finds correlations between two multivariate data sets, CCA data structures are a good fit for exploring relationships between the input and output variables found in ensemble data sets (such as those generated for sensitivity studies, uncertainty quantification, model tuning, or parameter studies).  Slycat™ uses CCA to model the many-to-many relationships between multiple input parameters and multiple output metrics.  CCA is a linear method and a direct generalization of several standard statistical techniques, including Principal Component Analysis (PCA), Multiple Linear Regression (MLR), and Partial Least Squares (PLS) [#]_ [#]_.

.. rubric:: Footnotes

.. [#] Hotelling, H., Relations Between Two Sets of Variates.  Biometrika, 28, 321-377 (1936).
.. [#] Adams, B.M., Ebeida, M.S., Eldred, M.S., Jakeman, J.D., Swiler, L.P., Bohnhoff, W.J., Dalbey,K.R., Eddy, J.P., Hu, K.T., Vigil, D.M., Bauman, L.E., and Hough, P.D., Dakota, a multilevel parallel object-oriented framework for design optimization, parameter estimation, uncertainty quantification, and sensitivity analysis: Version 5.3.1 user’s manual. Tech. Rep. SAND2010-2183, Sandia National Laboratories (2013).
.. [#] Ayachit, U., Bauer, A., Geveci, B., O’Leary, P., Moreland, K., Fabian, N., and Mauldin, J., ParaView Catalyst: Enabling In Situ Data Analysis and Visualization, Proceedings of the First Workshop on In Situ Infrastructures for Enabling Extreme-Scale Analysis and Visualization (ISAV2015), pp. 25-29, ACM, New York, NY (2015).
