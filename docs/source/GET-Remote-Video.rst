GET Remote Video
================

.. http:get:: /api/remotes/(sid)/videos/(vsid)

  Uses an existing remote session to retrieve a remote video.  The session must
  have been created successfully using :http:post:`/remotes` and video creation must have been
  started using :http:post:`/remotes/(sid)/videos`.  The caller should not attempt retrieving
  a video until a call to :http:get:`/remotes/(sid)/videos/(vsid)/status` indicates that video
  creation is complete.
  The returned file may be optionally cached on the server and retrieved
  using :http:get:`/projects/(pid)/cache/(key)`.

  :param sid: Unique remote session identifier.
  :type sid: string

  :param vsid: Unique video creation session identifier.
  :type vsid: string

  :query cache: Optional cache identifier.  Set to `project` to store the retrieved video in a project cache.
  :query project: Project identifier.  Required when `cache` is set to `project`.
  :query key: Cached object key.  Must be specified when `cache` is set to `project`.

  :status 200: The video has been returned in the response body.
  :status 206: A portion of the video has been returned in the response body.
  :status 400: "Agent required" This call requires a remote agent, but the current session isn't running an agent.
  :status 404: The session doesn't exist or has timed-out.

  :responseheader Content-Type: video/mp4 or video/webm, depending on the original :http:post:`/remotes/(sid)/videos` request.
  :responseheader X-Slycat-Message: For errors, contains a human-readable description of the problem.
  :responseheader X-Slycat-Hint: For errors, contains an optional description of how to fix the problem.

  **Sample Request**

  .. sourcecode:: http

    GET /remotes/505d0e463d5ed4a32bb6b0fe9a000d36/videos/431d0e463d5ed4a32bb6b0fe9a000a37

See Also
--------

* :http:get:`/remotes/(sid)/file(path)`
* :http:get:`/remotes/(sid)/image(path)`

