POST Get Job Output
===================

.. http:post:: /api/remotes/get-job-output

  Uses an existing remote sessions to fetch the content of a SLURM output file on a cluster.
  The session must have been created successfully using :http:post:`/api/remotes`

  :<json string sid: Unique remote session identifier.
  :<json string jid: Job ID.
  :<json string path: Path of the SLURM output file, if different from the login node.

  :status 200: The response contains the command, its output and possible errors.
  :status 400: The request failed due to invalid parameters or a Slycat agent issue.
  :status 500: The request failed due to no Slycat agent present and configured on the remote system.

  :responseheader Content-Type: application/json
  :responseheader X-Slycat-Message: For errors, contains a human-readable description of the problem.

  :>json int jid: Job ID.
  :>json string output: Content of the SLURM output file.
  :>json string errors: Error information, if any.

  Note that the *path* parameter is optional and the request will look for the output file within the home directory of a login node.
  Also, the content of the output file could potentially contain many lines of text.

  **Sample Request**

  .. sourcecode:: http

    POST /api/remotes/get-job-output

    {
      sid: "505d0e463d5ed4a32bb6b0fe9a000d36",
      jid: 123456
    }

  **Sample Response**

  .. sourcecode:: http

    {
      "jid": 123456,
      "output": "test",
      "errors": ""
    }

See Also
--------

* :http:post:`/api/remotes/cancel-job`
* :http:post:`/api/remotes/checkjob`
* :http:post:`/api/remotes/launch`
* :http:post:`/api/remotes/run-agent-function`
* :http:post:`/api/remotes/submit-batch`

