GET Remote Image
================

.. http:get:: /remotes/(sid)/image(path)

  Uses an existing remote session to retrieve a remote image.  The caller *may*
  supply additional parameters to resize the image and / or convert it to
  another file type.

  Note that specifying max-size, max-width, max-height, or a content-type that
  doesn't match the type of the underlying file can reduce performance
  significantly as the remote must then decompress, resample, and recompress the
  image before sending it to the client.

  :param sid: Unique session identifier returned from :http:post:`/remotes`.
  :type sid: string

  :param path: Remote filesystem absolute path to be retrieved.
  :type path: string

  :query string content-type: optional, Image content type to return.  Currently limited to `image/jpeg` or `image/png`.  If the requested content type doesn't match the content type of the remote image, it will be converted.
  :query int max-size: optional, Maximum image size in pixels along either dimension.  Images larger than this size will be resized to fit while maintaining their aspect ratio.
  :query int max-width: optional, Maximum image width.  Wider images will be resized to fit while maintaining their aspect ratio.
  :query int max-height: optional, Maximum image height.  Taller images will be resized to fit while maintaining their aspect ratio.

  :responseheader Content-Type: image/jpeg or image/png, depending on the type of the remote file and optional conversion.
  :responseheader X-Slycat-Message: For errors, contains a human-readable description of the problem.
  :responseheader X-Slycat-Hint: For errors, contains an optional description of how to fix the problem.

  :status 200: The requested file is returned in the body of the response.
  :status 404: The session doesn't exist or has timed-out.
  :status 400 Can't read directory.: The remote path is a directory instead of a file.
  :status 400 File not found.: The remote path doesn't exist.
  :status 400 Access denied.: The session user doesn't have permissions to access the file.

  **Sample Request**

  .. sourcecode:: http

    GET /remotes/505d0e463d5ed4a32bb6b0fe9a000d36/image/home/fred/avatar.png?content-type=image/jpeg&max-width=64

See Also
--------

* :http:post:`/remotes`
* :http:post:`/remotes/(sid)/browse(path)`
* :http:get:`/remotes/(sid)/file(path)`

