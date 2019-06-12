GET Remote Image
================

.. http:get:: /remotes/(sid)/image(path)

  Uses an existing remote session to retrieve a remote image.  The remote
  session must have been created using :http:post:`/remotes`, and the session
  must have a running agent.  Use :http:post:`/remotes/(sid)/browse(path)` to
  lookup remote file paths.
  The returned file may be optionally cached on the server and retrieved
  using :http:get:`/projects/(pid)/cache/(key)`.

  The caller *may* optionally choose to resize the image and / or convert it to
  another file type.  Note that this can reduce performance significantly as
  the remote must then decompress, resample, and recompress the image before
  sending it to the client.  Testing should be performed to verify that the
  bandwidth reduction of a smaller image is worth the increased latency.

  :param sid: Unique session identifier returned from :http:post:`/remotes`.
  :type sid: string

  :param path: Remote filesystem absolute path to be retrieved.
  :type path: string

  :query string content-type: Optional image content type to return.  Currently limited to `image/jpeg` or `image/png`.  If the requested content type doesn't match the content type of the remote image, it will be converted.
  :query int max-size: Optional maximum image size in pixels along either dimension.  Images larger than this size will be resized to fit while maintaining their aspect ratio.
  :query int max-width: Optional maximum image width.  Wider images will be resized to fit while maintaining their aspect ratio.
  :query int max-height: Optional maximum image height.  Taller images will be resized to fit while maintaining their aspect ratio.
  :query cache: Optional cache identifier.  Set to `project` to store the retrieved image in a project cache.
  :query project: Project identifier.  Required when `cache` is set to `project`.
  :query key: Cached object key.  Must be specified when `cache` is set to `project`.

  :status 200: The requested file is returned in the body of the response.
  :status 400: "Access denied" The session user doesn't have permissions to access the file.
  :status 400: "Agent required" This call requires a remote agent, but the current session isn't running an agent.
  :status 400: "Can't read directory" The remote path is a directory instead of a file.
  :status 400: "File not found" The remote path doesn't exist.
  :status 404: The session doesn't exist or has timed-out.

  :responseheader Content-Type: image/jpeg or image/png, depending on the type of the remote file and optional conversion.
  :responseheader X-Slycat-Message: For errors, contains a human-readable description of the problem.
  :responseheader X-Slycat-Hint: For errors, contains an optional description of how to fix the problem.

  **Sample Request**

  .. sourcecode:: http

    GET /remotes/505d0e463d5ed4a32bb6b0fe9a000d36/image/home/fred/avatar.png?content-type=image/jpeg&max-width=64

See Also
--------

* :http:get:`/remotes/(sid)/file(path)`
* :http:get:`/remotes/(sid)/videos/(vsid)`

