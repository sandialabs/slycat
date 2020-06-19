GET Remote File
===============

.. http:get:: /api/remotes/(hostname)/file(path)

  Uses an existing remote session to retrieve a remote file.  The remote
  session must have been created using :http:post:`/api/remotes`.  Use
  :http:post:`/api/remotes/(hostname)/browse(path)` to lookup remote file paths.
  The returned file may be optionally cached on the server and retrieved
  using :http:get:`/api/projects/(pid)/cache/(key)`.

  :param hostname: Unique hostname returned from :http:post:`/api/remotes`.
  :type hostname: string

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

    GET /api/remotes/localhost/file/home/slycat/src/slycat-data/TAIS/workdir.244/stress_zz_000001.png?cache=project&project=fe372daf01f75276c7e5228e6e000024&key=localhost%252Fhome%252Fslycat%252Fsrc%252Fslycat-data%252FTAIS%252Fworkdir.244%252Fstress_zz_000001.png HTTP/1.1
    Host: localhost:9000
    Connection: keep-alive
    User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36
    DNT: 1
    Accept: */*
    Referer: https://localhost:9000/models/514ac8d82e834e6cae2c25307ac1e69f?bid=18de324920c051bf768c9d2b7f0a23db
    Accept-Encoding: gzip, deflate, br
    Accept-Language: en-US,en;q=0.9
    Cookie: slycatauth=f204afc7e8ce44e79cdd41fc78ecd41b; slycattimeout=timeout

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    X-Powered-By: Express
    content-length: 59210
    expires: 0
    server: CherryPy/14.0.0
    pragma: no-cache
    cache-control: no-cache, no-store, must-revalidate
    date: Thu, 27 Jun 2019 21:49:32 GMT
    content-type: image/png
    connection: close

See Also
--------

* :http:get:`/api/remotes/(hostname)/image(path)`
* :http:get:`/api/remotes/(hostname)/videos/(vsid)`

