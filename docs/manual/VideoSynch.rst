Video Synchronization |VideoSynch|
----------------------------------
.. |VideoSynch| image:: VideoSynch.png

Beyond the video functionality described earlier (see the Media Set section), Slycat™ provides additional fine-grained and 
group-based video controls.  Once the first video is pinned, the interface shown in Figure 45 will appear in the model-specific 
controls to right of the Download Data Table |DownloadIcon| icon.  These video controls will remain visible until all videos 
are closed.  For a single video, these global controls provide single step accuracy in advancing or rewinding the animation,
which is not possible using the limited controls of an individual viewer.  However, the larger goal of this interface is to 
enable synchronized playback of multiple videos from a single set of controls. 

.. |DownloadIcon| image:: DownloadIcon.png

.. figure:: Figure45.png
   :align: center
   
   **Figure 45: Video controls: enable video synch, current video location (seconds from start), go to first frame, step back a frame, play, step forward a frame, and go to last frame, respectively.**
   
From left to right the controls are as follows: the video synchronization button |VideoSynch|, a numeric field providing the 
current video location in seconds from the video start, a button to go to the start of the video |FirstFrame|, a button to 
step backward by one frame |BackFrame| , play |Play|/pause |Pause| buttons (the icon changes to pause once play is pressed), a button to step forward by one frame |ForwardFrame|, and a button to go to the end of the video |LastFrame|.  

.. |FirstFrame| image:: FirstFrame.png
.. |BackFrame| image:: BackFrame.png
.. |Play| image:: Play.png
.. |Pause| image:: Pause.png
.. |ForwardFrame| image:: ForwardFrame.png
.. |LastFrame| image:: LastFrame.png

The video synch button is a toggle that enables/disables shared control of multiple videos.  The background color of the icon 
shows the state of the synchronization.  The background is gray when it is enabled |VideoSynchOn|, and white when it is 
disabled |VideoSynch|.  When video is synched, the playback buttons operate on all pinned videos.  When synch is disabled, 
the playback operates only on the *current* video. The current video is highlighted by drawing a shadow behind it, making it 
appear to float above the other videos, such as the middle video in Figure 46.  At all times, the video location field shows 
the current value of the video’s elapsed playback time (note that this is not the same as the simulation time stamp for a 
particular frame).  You can directly edit this field to align all videos to the frame that is closest to a specific time of 
interest in the playback.
.. |VideoSynchOn| image:: VideoSynchOn.png

.. figure:: Figure46.png
   :align: center
   
   **Figure 46: Three synched videos, where the middle video is the current video.**
   
