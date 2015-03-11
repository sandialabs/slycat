DELETE Project Cache Object
===========================

.. http:delete:: /projects/(pid)/cache/(cid)

  Deletes an object from the project cache.

  :param pid: Unique project identifier.
  :type mid: string

  :param cid: Unique cache object identifier.
  :type cid: string

  :status 204 Object deleted.: The cached object has been deleted.

  **Sample Request**

  .. sourcecode:: http

    DELETE /projects/dbaf026f919620acbf2e961ad732433d/cache/file://example.com/foo/bar/baz.jpg HTTP/1.1
    Host: localhost:8093
    Content-Length: 0
    Authorization: Basic c2x5Y2F0OnNseWNhdA==
    Accept-Encoding: gzip, deflate, compress
    Accept: */*
    User-Agent: python-requests/1.2.3 CPython/2.7.5 Linux/2.6.32-358.23.2.el6.x86_64

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 204 Object deleted.
    Date: Mon, 25 Nov 2013 20:35:59 GMT
    Content-Type: text/html;charset=utf-8
    Server: CherryPy/3.2.2

See Also
--------

- :http:get:`/projects/(pid)/cache/(cid)`

