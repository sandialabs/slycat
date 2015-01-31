POST Agent Video
================

.. http:post:: /agents/(sid)/videos

  Uses an existing agent session to create a video from a sequence of images.
  The session must have been created successfully using :http:post:`/agents`.  The
  caller *must* supply the session id, the desired video content type, and the
  paths of source images on the remote filesystem.  Because video compression may
  be time-consuming, a unique video session ID is returned.  The client must
  supply the video session ID along with the agent session ID in subsequent
  :http:get:`/agents/(sid)/videos/(vsid)/status` and :http:get:`/agents/(sid)/videos/(vsid)` requests.

  If the session doesn't exist or has timed-out, the server returns `404`.  If some
  other error prevents the data from being returned, the server returns `400`.

  :param sid: Unique agent session identifier.
  :type sid: string

  :requestheader Content-Type: application/json

  :<json string content-type: Content type for the final video.  Currently limited to "video/mp4" or "video/webm".
  :<json array images: List of absolute paths pointing to static images.

  :responseheader Content-Type: application/json

  :>json string sid: Unique video-creation session identifier.

  **Sample Request**

  .. sourcecode:: http

    POST /agents/505d0e463d5ed4a32bb6b0fe9a000d36/videos

    {
      content-type: "video/mp4",
      images: ["/home/fred/1.jpg", "/home/fred/2.jpg", "/home/fred/3.jpg", ...],
    }

  **Sample Response**

  .. sourcecode:: http

    {
      "sid" : 431d0e463d5ed4a32bb6b0fe9a000a37
    }

See Also
--------

* :http:get:`/agents/(sid)/videos/(vsid)`
* :http:get:`/agents/(sid)/videos/(vsid)/status`

