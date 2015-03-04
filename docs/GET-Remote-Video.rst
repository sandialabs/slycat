GET Remote Video
================

.. http:get:: /remotes/(sid)/videos/(vsid)

  Uses an existing remote video session to retrieve a remote video.  The session must
  have been created successfully using :http:post:`/remotes` and video creation must have been
  started using :http:post:`/remotes/(sid)/videos`.  The caller *must*
  supply the session id and video session id of the video to retrieve.

  :param sid: Unique remote session identifier.
  :type sid: string

  :param vsid: Unique video creation session identifier.
  :type vsid: string

  :responseheader Content-Type: video/mp4 or video/webm, depending on the original :http:post:`/remotes/(sid)/video` request.

  :status 404: The session doesn't exist or has timed-out.

  **Sample Request**

  .. sourcecode:: http

    GET /remotes/505d0e463d5ed4a32bb6b0fe9a000d36/videos/431d0e463d5ed4a32bb6b0fe9a000a37

See Also
--------

* :http:post:`/remotes/(sid)/videos`
* :http:get:`/remotes/(sid)/videos/(vsid)/status`

