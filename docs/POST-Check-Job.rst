POST Check Job
==============

.. http:post:: /remotes/checkjob

  Uses an existing remote session to query the status of submitted SLURM job on a cluster.
  The session must have been created successfully using :http:post:`/remotes`.

  :<json string sid: Unique remote session identifier.
  :<json string jid: Job ID.

  :status 200: The response contains the command, its output and possible errors.
  :status 400: The request failed due to invalid parameters or a Slycat agent issue.
  :status 500: The request failed due to no Slycat agent present and configured on the remote system.

  :responseheader Content-Type: application/json
  :responseheader X-Slycat-Message: For errors, contains a human-readable description of the problem.

  :>json int jid: Job ID.
  :>json string status: Status for the queried job.
  :>json string errors: Error information, if any.

  The following status are reported: PENDING, RUNNING, COMPLETING, COMPLETED and CANCELLED.

  **Sample Request**

  .. sourcecode:: http

    POST /remotes/checkjob

    {
      sid: "505d0e463d5ed4a32bb6b0fe9a000d36",
      jid: 123456
    }

  **Sample Response**

  .. sourcecode:: http

    {
      "jid": 123456,
      "status": "PENDING",
      "errors": ""
    }

See Also
--------

* :http:post:`/remotes/cancel-job`
* :http:post:`/remotes/get-job-output`
* :http:post:`/remotes/launch`
* :http:post:`/remotes/run-agent-function`
* :http:post:`/remotes/submit-batch`
