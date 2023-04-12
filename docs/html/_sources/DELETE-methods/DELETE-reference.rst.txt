DELETE Reference
================

.. http:delete:: /api/references/(rid)

  Deletes the link to model in project

  :param rid: Unique reference identifier.
  :type rid: string

  :status 204: Reference deleted.

  **Sample Request**

  .. sourcecode:: http

    DELETE /api/reference/1j2j34539570439cb3703c0f8806158e HTTP/1.1
    Accept: */*
    Accept-Encoding: gzip, deflate, br
    Accept-Language: en-US,en;q=0.9
    Connection: keep-alive
    Cookie: slycattimeout=timeout; slycatauth=52230b361ec442ffa6d608da64ab4617
    DNT: 1
    Host: localhost:9000
    Origin: https://localhost:9000
    Referer: https://localhost:9000/models/a0a6c7d6694b4f99a5b7aa635f3f44a4
    User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.80 Safari/537.36
    X-Requested-With: XMLHttpRequest

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 204 Reference deleted.
    X-Powered-By: Express
    expires: 0
    server: CherryPy/14.0.0
    pragma: no-cache
    cache-control: no-cache, no-store, must-revalidate
    date: Thu, 13 Jun 2019 21:33:05 GMT
    content-type: text/html;charset=utf-8
    connection: close

See Also
--------

- :http:delete:`/api/projects/data/(did)`

