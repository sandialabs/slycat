Find Data Dialog
----------------

Using the radio buttons, select the data input type.  Next, select a remote host from the *Hostname* dropdown.  Unlike CCA or
Parameter Space, only hosts included in the dropdown list may be used.  This is because time series analysis requires parallel 
job launching functionality found in the Slycat™ agent, which must be running on the remote machine.  Although the Slycat™ 
agent assists you in remotely submitting the analysis job to the cluster queue, you will be running the job under your own 
user credentials.  Consequently, the host must be a machine on which you already have a user account.  Enter your username 
and password into the associated fields.  Hitting the Enter button after typing in your password will both log you into the 
remote machine and take you to the next screen in the wizard.  If you have recently accessed the selected host through Slycat™, 
the Username and Password fields will not be shown.  This is because Slycat™ maintains remote sessions for a fixed period of 
time after your initial login to reduce the number of login requests.  In this case, click the Continue button to advance the 
wizard.

.. figure:: Figure49.png
   :scale: 75
   :align: center
   
   **Figure 49: Initial dialog to identify data set type and where it is located.** 
   
