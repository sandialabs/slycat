GET Agent Video
===============

.. http:get:: /agents/(sid)/videos/(vsid)

  Uses an existing agent video session to retrieve a remote video.  The session must
  have been created successfully using :http:post:`/agents` and video creation must have been
  started using :http:post:`/agents/(sid)/video`.  The caller *must*
  supply the session id and video session id of the video to retrieve.

  :param sid: Unique agent session identifier.
  :type sid: string

  :param vsid: Unique video creation session identifier.
  :type vsid: string

  :responseheader Content-Type: video/mp4 or video/webm, depending on the original :http:post:`/agents/(sid)/video` request.

  :status 404: The session doesn't exist or has timed-out.

  **Sample Request**

  .. sourcecode:: http

    GET /agents/505d0e463d5ed4a32bb6b0fe9a000d36/videos/431d0e463d5ed4a32bb6b0fe9a000a37

See Also
--------

* :http:post:`/agents/(sid)/videos`
* :http:get:`/agents/(sid)/videos/(vsid)/status`

