POST Check Job
==============

.. http:post:: /api/remotes/checkjob

  Uses an existing remote session to query the status of submitted SLURM job on a cluster.
  The session must have been created successfully using :http:post:`/api/remotes`.

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

    POST /api/remotes/checkjob  HTTP/1.1

    {
      sid: "505d0e463d5ed4a32bb6b0fe9a000d36",
      jid: 123456
    }

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK

    {
      "jid": 123456,
      "status": "PENDING",
      "errors": ""
    }

See Also
--------

* :http:post:`/api/remotes/cancel-job`
* :http:post:`/api/remotes/get-job-output`
* :http:post:`/api/remotes/launch`
* :http:post:`/api/remotes/submit-batch`
