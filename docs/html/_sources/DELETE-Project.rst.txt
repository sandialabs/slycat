DELETE Project
==============

.. http:delete:: /api/projects/(pid)

  Deletes a project and all its models.

  :param pid: Unique project identifier.
  :type mid: string

  :status 204: The project, its models, and artifacts have been deleted.

  **Sample Request**

  .. sourcecode:: http

    DELETE /api/projects/9031c032d770b55db6e66fca0d000fc6 HTTP/1.1
    Host: localhost:9000
    Connection: keep-alive
    Accept: */*
    Origin: https://localhost:9000
    X-Requested-With: XMLHttpRequest
    User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.80 Safari/537.36
    DNT: 1
    Referer: https://localhost:9000/projects/9031c032d770b55db6e66fca0d000fc6
    Accept-Encoding: gzip, deflate, br
    Accept-Language: en-US,en;q=0.9
    Cookie: slycattimeout=timeout; slycatauth=52230b361ec442ffa6d608da64ab4617

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 204 Project deleted.
    X-Powered-By: Express
    expires: 0
    server: CherryPy/14.0.0
    pragma: no-cache
    cache-control: no-cache, no-store, must-revalidate
    date: Thu, 13 Jun 2019 22:26:10 GMT
    content-type: text/html;charset=utf-8
    connection: close

See Also
--------

- :http:get:`/api/projects/(pid)`
- :http:put:`/api/projects/(pid)`

