Creating a Parameter Space Model
--------------------------------

Like the CCA model, the core of the Parameter Space model is table data.  Up until the stage where inputs and outputs for the 
model are selected, the model creation steps are identical to CCA (see Creating a CCA Model).  Instead of initializing all 
variables as *Input*, the variables default to being assigned as *Neither*.  As with CCA, group selection operations using 
shift-click and/or control-click allow rapid assignment of variable types (see Select Columns).  However, a central difference 
in the Parameter Space model is that variables can also be designated as being *Categorical* and/or *Editable*.

.. figure:: Figure25.png
   :scale: 75
   :align: center
   
   **Figure 25: Parameter Space model creation wizard dialog for designating variable attributes, including Categorical and Editable.**
  
*Categorical* variables are those with a limited number of discrete values.  During scatterplot filtering, it is often 
advantageous to be able to turn on or off points that are associated with specific values or combinations of values.  
*Categorical* variables are filtered using labeled buttons, which can individually be set *on* or *off*.  Continuous variables 
are filtered using a slider, which is limited to defining a single range of values to be included or excluded.  By declaring 
*Year* and *Cylinders* as *Categorical* variables during model creation, the example in Figure 26 shows how we can filter the 
scatterplot display to be only those cars having 3, 5, or 8 cylinders that were manufactured in even-numbered years.  This 
fine-grained filtering of the data would be impossible using a range slider.

.. figure:: Figure26.png
   :scale: 75
   :align: center
   
   **Figure 26: Filters for Categorical variables enumerate each discrete value as a labeled button, enabling filtering operations that would not be possible using range sliders.  The values selected here (shown in dark blue) limit the scatterplot to display just those cars with 3, 5, or 8 cylinders that were manufactured in even-numbered years.**
   
An *Editable* variable is one that can be modified by the user.  The type of values originally in the variable define the type 
of values that can be substituted (i.e. numeric variables cannot be changed into text strings).  A variable can only be defined 
as *Editable* during model creation.  The mechanism for changing variable values is through selection (see Selecting Points).  
Note that value modification actions in the *Selection Action* dropdown list are only enabled when an Editable variable has been 
declared.
