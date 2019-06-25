GET Project Cache Object
========================

.. http:get:: /api/projects/(pid)/cache/(key)

  Retrieves an object from a project's cache. Cache objects are opaque binary
  blobs that may contain arbitrary data, plus an explicit content type.

  :param pid: Unique project identifier.
  :type mid: string

  :param key: Cache object identifier.
  :type key: string

  :status 200: The requested file is returned in the body of the response.
  :status 404: The requested object isn't in the cache.

  :responseheader Content-Type: The content type of the cached object, which could be any valid MIME type.
  **Sample Request**

  .. sourcecode:: http

    GET /api/projects/fe372daf01f75276c7e5228e6e000024/cache/localhost%2Fhome%2Fslycat%2Fsrc%2Fslycat-data%2FTAIS%2Fworkdir.246%2Fstress_zz_000001.png HTTP/1.1
    Host: localhost:9000
    Connection: keep-alive
    User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36
    DNT: 1
    Accept: */*
    Referer: https://localhost:9000/models/514ac8d82e834e6cae2c25307ac1e69f?bid=18de324920c051bf768c9d2b7f0a23db
    Accept-Encoding: gzip, deflate, br
    Accept-Language: en-US,en;q=0.9
    Cookie: slycatauth=fa4387fcf4fe4070baea14195e708744; slycattimeout=timeout

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    X-Powered-By: Express
    content-length: 63675
    expires: 0
    server: CherryPy/14.0.0
    pragma: no-cache
    cache-control: no-cache, no-store, must-revalidate
    date: Thu, 20 Jun 2019 21:38:18 GMT
    content-type: image/png
    connection: close

See Also
--------

- :http:delete:`/api/projects/(pid)/cache/(key)`
- :http:get:`/api/remotes/(sid)/file(path)`
- :http:get:`/api/remotes/(sid)/image(path)`
- :http:get:`/api/remotes/(sid)/videos/(vsid)`
