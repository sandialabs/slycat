GET Agent Video Status
======================

.. http:get:: /agents/(sid)/videos/(vsid)/status

  Uses an existing agent video session to retrieve the status of a
  video creation command.  The session must have been created successfully using
  :http:post:`/agents` and video creation must have been started using :http:post:`/agents/(sid)/video`.

  :param sid: Unique agent session identifier.
  :type sid: string

  :param vsid: Unique video creation session identifier.
  :type vsid: string

  :responseheader Content-Type: application/json

  :statuscode 404: If the session doesn't exist or has timed out.

  **Sample Request**

  .. sourcecode:: http

    GET /agents/505d0e463d5ed4a32bb6b0fe9a000d36/videos/431d0e463d5ed4a32bb6b0fe9a000a37/status

See Also
--------

* :http:post:`/agents/(sid)/videos`
* :http:get:`/agents/(sid)/videos/(vsid)`

