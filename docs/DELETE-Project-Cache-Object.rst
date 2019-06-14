DELETE Project Cache Object
===========================

.. http:delete:: /api/projects/(pid)/cache/(key)

  Deletes an object from the project cache.

  :param pid: Unique project identifier.
  :type pid: string

  :param key: Cache object identifier.
  :type key: string

  :status 204: The cached object has been deleted.

  **Sample Request**

  .. sourcecode:: http

    DELETE /api/projects/dbaf026f919620acbf2e961ad732433d/cache/file://example.com/foo/bar/baz.jpg HTTP/1.1
    Host: localhost:8093
    Content-Length: 0
    Authorization: Basic c2x5Y2F0OnNseWNhdA==
    Accept-Encoding: gzip, deflate, compress
    Accept: */*
    User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.80 Safari/537.36

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 204 Object deleted.
    Date: Mon, 25 Nov 2018 20:35:59 GMT
    Content-Type: text/html;charset=utf-8
    Server: CherryPy/14.0.0

See Also
--------

- :http:get:`/api/projects/(pid)/cache/(key)`

