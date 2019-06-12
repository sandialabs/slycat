POST Agent Function
===================

.. http:post:: /remotes/run-agent-function

  Uses an existing remote sessions to submit a predefined Slycat function to a cluster running SLURM as a job.
  The session must have been created successfully using :http:post:`/remotes`

  :<json string sid: Unique remote session identifier.
  :<json string wckey: Workload characterization key.
  :<json int nnodes: Number of nodes requested for the job.
  :<json string partition: Name of the partition where the job will be run.
  :<json int ntasks_per_node: Number of tasks to run on a node.
  :<json int ntasks: Number of tasks allocated for the job.
  :<json int ncpu_per_task: Number of CPUs per task requested for the job.
  :<json int time_hours: Number of hours requested for the job.
  :<json int time_minutes: Number of minutes requested for the job.
  :<json int time_seconds: Number of seconds requested for the job.
  :<json string fn: Name of the Slycat predefined function.

  :status 200: The response contains the command, its output and possible errors.
  :status 400: The request failed due to invalid parameters or a Slycat agent issue.
  :status 500: The request failed due to no Slycat agent present and configured on the remote system.

  :responseheader Content-Type: application/json
  :responseheader X-Slycat-Message: For errors, contains a human-readable description of the problem.

  :>json int jid: Job ID.
  :>json string errors: Error information, if any.

  **Sample Request**

  .. sourcecode:: http

    POST /remotes/run-agent-function

    {
      sid: "505d0e463d5ed4a32bb6b0fe9a000d36",
      wckey: "user_00001",
      nnodes: 1,
      partition: "partition_name",
      ntasks_per_node: 1,
      ntasks: 1,
      ncpu_per_task: 4,
      time_hours: 0,
      time_minutes: 5,
      time_seconds: 0,
      fn: "slycat_predefined_function"
    }

  **Sample Response**

  .. sourcecode:: http

    {
      "jid": 123456,
      "errors": ""
    }

See Also
--------

* :http:post:`/remotes/cancel-job`
* :http:post:`/remotes/checkjob`
* :http:post:`/remotes/get-job-output`
* :http:post:`/remotes/launch`
* :http:post:`/remotes/submit-batch`

