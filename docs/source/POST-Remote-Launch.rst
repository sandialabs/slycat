POST Remote Launch
==================

.. http:post:: /api/remotes/launch

  Uses an existing remote session to submit a command.
  The session must have been created successfully using :http:post:`/api/remotes`.

  :<json string sid: Unique remote session identifier.
  :<json string command: command to be ran on the remote system.

  :status 200: The response contains the command, its output and possible errors.
  :status 400: The request failed due to invalid parameters or a Slycat agent issue.
  :status 500: The request failed due to a SSH exception.

  :responseheader Content-Type: application/json
  :responseheader X-Slycat-Message: For errors, contains a human-readable description of the problem.

  :>json string command: Command issued to the remote system.
  :>json string output: Output of the command.
  :>json string errors: Error information, if any.

  **Sample Request**

  .. sourcecode:: http

    POST /api/remotes/launch

    {
      sid: "505d0e463d5ed4a32bb6b0fe9a000d36",
      command: "echo test"
    }

  **Sample Response**

  .. sourcecode:: http

    {
      "command": "echo test",
      "output": "test",
      "errors": ""
    }

See Also
--------

* :http:post:`/api/remotes/cancel-job`
* :http:post:`/api/remotes/checkjob`
* :http:post:`/api/remotes/get-job-output`
* :http:post:`/api/remotes/run-agent-function`
* :http:post:`/api/remotes/submit-batch`
