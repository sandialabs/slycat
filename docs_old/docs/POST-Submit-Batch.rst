POST Submit Batch
=================

.. http:post:: /remotes/submit-batch

  Uses an existing remote sessions to submit a batch file to start a job on a cluster running SLURM.
  The session must have been created successfully using :http:post:`/remotes`.

  :<json string sid: Unique remote session identifier.
  :<json string filename: Name for the batch file.

  :status 200: The response contains the command, its output and possible errors.
  :status 400: The request failed due to invalid parameters or a Slycat agent issue.
  :status 500: The request failed due to no Slycat agent present and configured on the remote system.

  :responseheader Content-Type: application/json
  :responseheader X-Slycat-Message: For errors, contains a human-readable description of the problem.

  :>json string filename: Name of the file submitted in the request.
  :>json int jid: Job ID.
  :>json string errors: Error information, if any.

  **Sample Request**

  .. sourcecode:: http

    POST /remotes/submit-batch

    {
      sid: "505d0e463d5ed4a32bb6b0fe9a000d36",
      filename: "/home/jdoe/batch.test.bash"
    }

  **Sample Response**

  .. sourcecode:: http

    {
      "filename": "/home/jdoe/batch.test.bash",
      "jid": 123456,
      "errors": ""
    }

See Also
--------

* :http:post:`/remotes/cancel-job`
* :http:post:`/remotes/checkjob`
* :http:post:`/remotes/get-job-output`
* :http:post:`/remotes/launch`
* :http:post:`/remotes/run-agent-function`