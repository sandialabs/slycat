GET Remote Video
================

.. http:get:: /remotes/(sid)/videos/(vsid)

  Uses an existing remote session to retrieve a remote video.  The session must
  have been created successfully using :http:post:`/remotes` and video creation must have been
  started using :http:post:`/remotes/(sid)/videos`.  The caller should not attempt retrieving
  a video until a call to :http:get:`/remotes/(sid)/videos/(vsid)/status` indicates that video
  creation is complete.

  :param sid: Unique remote session identifier.
  :type sid: string

  :param vsid: Unique video creation session identifier.
  :type vsid: string

  :status 404: The session doesn't exist or has timed-out.

  :responseheader Content-Type: video/mp4 or video/webm, depending on the original :http:post:`/remotes/(sid)/videos` request.

  **Sample Request**

  .. sourcecode:: http

    GET /remotes/505d0e463d5ed4a32bb6b0fe9a000d36/videos/431d0e463d5ed4a32bb6b0fe9a000a37

See Also
--------

* :http:get:`/remotes/(sid)/file(path)`
* :http:get:`/remotes/(sid)/image(path)`

