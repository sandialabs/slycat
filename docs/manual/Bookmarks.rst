Bookmarks
---------

Each time you interact with a model, changes in model state are preserved in a Bookmark and the URL in your browser’s address 
bar is modified to incorporate the latest bookmark id.  The id links to a description of the model state that is stored on the 
Slycat™ server.  Although the contents of a bookmark are model dependent, all bookmarks capture the current visualization state 
so that it can be reproduced (though parameters such as view region sizes are not saved, since they are device dependent).  
Examples of the types of information stored in a bookmark include color-encoding, highlighted selections, filter values and 
limits, pinned media selections, and hidden points.  

Bookmarking enables many useful functions.  Dragging and dropping the URL from the address bar into an email, you can share a 
specific state of the visualization with other project members.  If you save model pages as browser bookmarks, you can archive 
and recall interesting model states, though you will be limited to viewing them on the machine where you created them.  The 
current bookmark id is stored locally in your browser’s cache.  This enables you to pick up where you left off when you begin 
new session with a previously viewed model.  

Within Slycat™ there is the concept of a saved *Bookmark*.  This *Bookmark* is a persistent link to a model state that you 
explicitly save within a project.  Slycat™ saves the current bookmark id along with a label that you provide.  This provides a 
convenient, machine-independent mechanism for saving exploratory results.  *Bookmarks* can be used to remember visualizations 
that reveal interesting patterns, to share findings with other team members, or to create a flipbook-style narrative for a 
demonstration.  

To create a *Bookmark*, click the blue *Bookmarks* button from within a model page and select *Create New* (Figure 10).  A 
*Create Saved Bookmark* popup will appear (Figure 11).  Type in a *Name* and click the *Save Bookmark* button on the right to 
save it, or click on the *X* button in the upper right corner of the dialog to abort the operation.  The *Bookmarks* button 
dropdown will display a list of all the bookmarks associated with the project.  If you are on a model page, *Bookmarks* 
associated with that model are listed at the top, while those for other models appear below, each labeled with their model type.  
Clicking on a *Bookmark* in the list takes you to the associated model and visualizes it according to the saved state.  To 
modify the name of a bookmark, click on the yellow pencil icon.  To delete a bookmark, click on its red trashcan.

.. figure:: Figure10.png
   :align: center
   
   **Figure 10:** *Bookmarks* **dropdown, including one previously saved bookmark.**

.. figure:: Figure11.png
   :align: center
   
   **Figure 11: Example of a** *Create Saved Bookmark* **dialog.**

Note that changes to the *View Regions* are not currently preserved in bookmarks.  Consequently, when the layout has been 
modified prior to the model being bookmarked, visualizing the *Bookmark* will render the model using the default *View Regions* 
layout.
