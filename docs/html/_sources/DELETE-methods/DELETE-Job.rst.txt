DELETE Job
==========

.. http:delete:: /api/remotes/delete-job/(hostname)/(jid)

  Deletes a remote job by calling cancel on the job using a connected session to
  an HPC machine. Submits a command to the slycat-agent to cancel a running job
  on a cluster running SLURM.

  :param hostname: name of the host where the job is running
  :type mid: string

  :param jid: Job ID
  :type mid: string

  :status 204: The remote job has been deleted.
  :status 400: status message from agent will be displayed
  :status 500: No Slycat agent present on remote host

  **Sample Request**

  .. sourcecode:: http

    DELETE /api/remotes/hostname/132435 HTTP/1.1
    Host: localhost:8093
    Content-Length: 0
    Authorization: Basic c2x5Y2F0OnNseWNhdA==
    Accept-Encoding: gzip, deflate, compress
    Accept: */*
    User-Agent: python-requests/1.2.3 CPython/2.7.5 Linux/2.6.32-358.23.2.el6.x86_64

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 204 Job deleted.
    Date: Mon, 25 Nov 2013 20:35:59 GMT
    Content-Type: text/html;charset=utf-8
    Server: CherryPy/14.0.0

See Also
--------

- :http:post:`/api/remotes`

