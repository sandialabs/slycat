GET Remote Video Status
=======================

.. http:get:: /remotes/(sid)/videos/(vsid)/status

  Uses an existing remote video session to retrieve the status of a
  video creation command.  The remote session must have been created successfully using
  :http:post:`/remotes` and video creation must have been started using :http:post:`/remotes/(sid)/videos`.

  :param sid: Unique remote session identifier.
  :type sid: string

  :param vsid: Unique video creation session identifier.
  :type vsid: string

  :status 200: The status is contained in the response body.
  :status 400: "Agent required" This call requires a remote agent, but the current session isn't running an agent.
  :status 404: If the session doesn't exist or has timed out.

  :responseheader Content-Type: application/json
  :responseheader X-Slycat-Message: For errors, contains a human-readable description of the problem.
  :responseheader X-Slycat-Hint: For errors, contains an optional description of how to fix the problem.

  :>json boolean ok: Set to `true` if the video creation process is working, `false` if it has failed.
  :>json boolean ready: Optional.  Set to `true` if the video creation process has completed successfully and the video file is ready for retrieval.
  :>json string message: Human-readable message describing the current video creation state or error.
  :>json number returncode: Optional exit code from the video creation process.  Note: this is for debugging only, could be removed in the future, and should not be displayed to end-users.
  :>json string stderr: Optional capture of stderr from the video creation process. Note: this is for debugging only, could be removed in the future, and should not be displayed to end-users.

  **Sample Request**

  .. sourcecode:: http

    GET /remotes/505d0e463d5ed4a32bb6b0fe9a000d36/videos/431d0e463d5ed4a32bb6b0fe9a000a37/status

See Also
--------

* :http:post:`/remotes/(sid)/videos`
* :http:get:`/remotes/(sid)/videos/(vsid)`

