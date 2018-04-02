Taylor Anvil Impact Scenario (TAIS) Data Set
--------------------------------------------

TAIS was generated using Sierra/SolidMechanics [#]_ (a Lagrangian, three-dimensional code for problems with large deformations 
and nonlinear material behaviors) in combination with ParaView/Catalyst [#]_.  The images were generated in situ (at the same 
time as the physics simulation) using Catalyst.  The simulation is of an Oxygen Free High Conductivity (OFHC) copper cylinder, 
2.54 cm long with a diameter of .762 cm and an initial velocity of 190 m/sec, impacting a rigid wall.  The ensemble is a 
sensitivity study that evaluates the effects of changing four parameters of the Johnson-Cook inelastic constitutive law: *ajo*,
*bjo*, *njo*, and *beta*.  The height and radius of the cylinder after the impact are compared to experimental photographic 
results.  Two output metrics are calculated for each run, *ndrf_last* and *ndhf_last*.  These variables are the **n**ormalized 
**d**ifferences between the **r**adius/**h**eight of the **f**inal cylinder state from the **last** timestep of the simulation 
and the final radius/height of the cylinder in the experiment, respectively.  Since the differences would decrease in those cases 
where the simulation more closely matched the experimental results, the optimal case would be a simulation where the values of 
these two metrics were zero (i.e. there is no difference between the simulation and the experiment).

.. rubric:: Footnotes

.. [#] S. S. M. Team. *Sierra/SolidMechanics 4.22 User’s Guide*. Technical Report SAND2011-7597, Sandia National Laboratories (2011).
.. [#] Ayachit, U., Bauer, A., Geveci, B., O’Leary, P., Moreland, K., Fabian, N., and Mauldin, J., *ParaView Catalyst: Enabling In Situ Data Analysis and Visualization*, Proceedings of the First Workshop on In Situ Infrastructures for Enabling Extreme-Scale Analysis and Visualization (ISAV2015), pp. 25-29, ACM, New York, NY (2015).
