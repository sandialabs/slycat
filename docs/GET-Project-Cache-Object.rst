GET Project Cache Object
========================

.. http:get:: /projects/(pid)/cache/(cid)

  Retrieves an object from a project's cache. Objects are opaque binary blobs
  that may contain arbitrary data, plus an explicit content type.

  :param pid: Unique project identifier.
  :type mid: string

  :param cid: Unique cache object identifier.
  :type cid: string

  :query string remote: optional, unique remote session id.
  :query string file: optional, remote filesystem path (must be absolute).
  :query string image: optional, remote filesystem path (must be absolute).
  :query string video: optional, unique video session id.

  :responseheader Content-Type: The content type of the cached object, which could be anything.
  :responseheader X-Slycat-Message: For errors, contains a human-readable description of the problem.
  :responseheader X-Slycat-Hint: For errors, contains an optional description of how to fix the problem.

  :status 200: The requested file is returned in the body of the response.
  :status 400 Access denied.: The session user doesn't have permissions to access the file.
  :status 400 Can't read directory.: The remote path is a directory instead of a file.
  :status 400 File not found.: The remote path doesn't exist.
  :status 404 Not in cache.: The requested object isn't in the cache.
  :status 404: The session doesn't exist or has timed-out.

See Also
--------

- :http:get:`/agents/(sid)/file(path)`
- :http:get:`/agents/(sid)/image(path)`
- :http:get:`/agents/(sid)/videos/(vsid)`
