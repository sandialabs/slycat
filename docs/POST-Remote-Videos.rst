POST Remote Videos
==================

.. http:post:: /remotes/(sid)/videos

  Uses an existing remote session to create a video from a sequence of images.
  The session must have been created successfully using :http:post:`/remotes`
  and the session must have a running agent.  The caller *must* supply the
  session id, the desired video content type, and the paths of source images on
  the remote filesystem.  Because video compression may be time-consuming, a
  unique video session ID is returned.  The client must supply the video
  session ID along with the remote session ID in subsequent
  :http:get:`/remotes/(sid)/videos/(vsid)/status` and
  :http:get:`/remotes/(sid)/videos/(vsid)` requests.

  :param sid: Unique remote session identifier.
  :type sid: string

  :requestheader Content-Type: application/json

  :<json string content-type: Content type for the final video.  Currently limited to "video/mp4" or "video/webm".
  :<json array images: List of absolute paths pointing to static images.

  :status 202: Video creation has started.
  :status 400 Agent required.: This call requires a remote agent, but the current session isn't running an agent.
  :status 400: Couldn't start video creation with the current request parameters.
  :status 404: The session doesn't exist or has timed-out.

  :responseheader Content-Type: application/json
  :responseheader X-Slycat-Message: For errors, contains a human-readable description of the problem.
  :responseheader X-Slycat-Hint: For errors, contains an optional description of how to fix the problem.

  :>json string sid: Unique video-creation session identifier.

  **Sample Request**

  .. sourcecode:: http

    POST /remotes/505d0e463d5ed4a32bb6b0fe9a000d36/videos

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

* :http:get:`/remotes/(sid)/videos/(vsid)`
* :http:get:`/remotes/(sid)/videos/(vsid)/status`

