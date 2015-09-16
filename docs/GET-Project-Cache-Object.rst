GET Project Cache Object
========================

.. http:get:: /projects/(pid)/cache/(key)

  Retrieves an object from a project's cache. Cache objects are opaque binary
  blobs that may contain arbitrary data, plus an explicit content type.

  :param pid: Unique project identifier.
  :type mid: string

  :param key: Cache object identifier.
  :type key: string

  :status 200: The requested file is returned in the body of the response.
  :status 404: The requested object isn't in the cache.

  :responseheader Content-Type: The content type of the cached object, which could be any valid MIME type.

See Also
--------

- :http:delete:`/projects/(pid)/cache/(key)`
- :http:get:`/remotes/(sid)/file(path)`
- :http:get:`/remotes/(sid)/image(path)`
- :http:get:`/remotes/(sid)/videos/(vsid)`
