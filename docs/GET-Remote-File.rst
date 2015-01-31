GET Remote File
==================

.. http:get:: /remotes/(sid)/file(path)

  Uses an existing session to retrieve a remote file.  The
  session must have been created successfully using :http:post:`/remotes`.  The caller
  *must* supply the session id and the path on the remote filesystem to retrieve.

  If the session doesn't exist or has timed-out, the server returns `404`.

  If the session has failed (is in an unusable state), the server returns `500 Remote access failed.`,
  and the client should create a new remote session.

  If the remote path is a reference to a directory, the server returns `400 Can't read directory.`

  If the remote path doesn't exist, the server returns `400 File not found.`

  If the session user doesn't have permissions to access the file, the server returns `400 Access denied.`

  For other errors, the server returns `400 Remote access failed.`.

  The server may provide additional detail describing the error in the `Slycat-Message` and `Slycat-Hint` response headers.

  Otherwise, the requested file is returned to the caller.


  :responseheader Content-Type: The content-type of the response is automatically determined based on the filename.

  If there is an error, the response headers will include a `Slycat-Message`
  field with a human-readable description of the problem, and an optional
  `Slycat-Hint` field containing a description of how to fix the problem.

  **Sample Request**

  .. sourcecode:: http

    GET /remotes/505d0e463d5ed4a32bb6b0fe9a000d36/file/home/fred/test.csv

See Also
--------

* :http:post:`/remotes`
* :http:post:`/remotes/(sid)/browse(path)`

