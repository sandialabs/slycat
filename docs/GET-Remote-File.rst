GET Remote File
===============

.. http:get:: /remotes/(sid)/file(path)

  Uses an existing remote session to retrieve a remote file.  The remote
  session must have been created using :http:post:`/remotes`.  Use
  :http:post:`/remotes/(sid)/browse(path)` to lookup remote file paths.
  The returned file may be optionally cached on the server and retrieved
  using :http:get:`/projects/(pid)/cache/(key)`.

  :param sid: Unique session identifier returned from :http:post:`/remotes`.
  :type sid: string

  :param path: Remote filesystem path (must be absolute).
  :type path: string

  :query cache: Optional cache identifier.  Set to `project` to store the retrieved file in a project cache.
  :query project: Project identifier.  Required when `cache` is set to `project`.
  :query key: Cached object key.  Must be specified when `cache` is set to `project`.

  :status 200: The requested file is returned in the body of the response.
  :status 404: The session doesn't exist or has timed-out.
  :status 400: "Can't read directory" The remote path is a directory instead of a file.
  :status 400: "File not found" The remote path doesn't exist.
  :status 400: "Access denied" The session user doesn't have permissions to access the file.

  :responseheader Content-Type: The MIME type of the response is automatically determined using the requested filename.
  :responseheader X-Slycat-Message: For errors, contains a human-readable description of the problem.
  :responseheader X-Slycat-Hint: For errors, contains an optional description of how to fix the problem.

  **Sample Request**

  .. sourcecode:: http

    GET /remotes/505d0e463d5ed4a32bb6b0fe9a000d36/file/home/fred/checklist.txt

See Also
--------

* :http:get:`/remotes/(sid)/image(path)`
* :http:get:`/remotes/(sid)/videos/(vsid)`

