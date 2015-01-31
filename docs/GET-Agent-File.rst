GET Agent File
==============

.. http:get:: /agents/(sid)/file(path)

  Uses an existing agent session to retrieve a remote file.

  :param sid: Unique session identifier returned from :http:post:`/agents`.
  :type sid: string

  :param path: Remote filesystem path (must be absolute).
  :type path: string

  :responseheader Content-Type: The MIME type of the response is automatically determined using the requested filename.
  :responseheader X-Slycat-Message: For errors, contains a human-readable description of the problem.
  :responseheader X-Slycat-Hint: For errors, contains an optional description of how to fix the problem.

  :status 200: The requested file is returned in the body of the response.
  :status 404: The session doesn't exist or has timed-out.
  :status 400 Can't read directory.: The remote path is a directory instead of a file.
  :status 400 File not found.: The remote path doesn't exist.
  :status 400 Access denied.: The session user doesn't have permissions to access the file.

  **Sample Request**

  .. sourcecode:: http

    GET /agents/505d0e463d5ed4a32bb6b0fe9a000d36/file/home/fred/checklist.txt

See Also
--------

* :http:post:`/agents`
* :http:post:`/agents/(sid)/browse(path)`
* :http:get:`/agents/(sid)/image(path)`

