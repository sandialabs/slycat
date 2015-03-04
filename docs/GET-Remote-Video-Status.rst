GET Remote Video Status
=======================

.. http:get:: /remotes/(sid)/videos/(vsid)/status

  Uses an existing remote video session to retrieve the status of a
  video creation command.  The session must have been created successfully using
  :http:post:`/remotes` and video creation must have been started using :http:post:`/remotes/(sid)/video`.

  :param sid: Unique remote session identifier.
  :type sid: string

  :param vsid: Unique video creation session identifier.
  :type vsid: string

  :responseheader Content-Type: application/json

  :statuscode 404: If the session doesn't exist or has timed out.

  **Sample Request**

  .. sourcecode:: http

    GET /remotes/505d0e463d5ed4a32bb6b0fe9a000d36/videos/431d0e463d5ed4a32bb6b0fe9a000a37/status

See Also
--------

* :http:post:`/remotes/(sid)/videos`
* :http:get:`/remotes/(sid)/videos/(vsid)`

