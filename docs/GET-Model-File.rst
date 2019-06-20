GET Model File
==============

.. http:get:: /models/(mid)/files/(aid)

  Retrieves a file artifact from a model. File artifacts are effectively
  binary blobs that may contain arbitrary data with an explicit content
  type.

  :param mid: Unique model identifier.
  :type mid: string

  :param aid: File artifact id.
  :type aid: string

  :responseheader Content-Type: The content type of the file artifact, which could be anything.

  **Sample Request**

  .. sourcecode:: http

    GET /api/models/e2bde9b063a541008853eb4d9603fbf3/files/clusters HTTP/1.1
    Host: localhost:9000
    Connection: keep-alive
    Accept: */*
    DNT: 1
    X-Requested-With: XMLHttpRequest
    User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36
    Content-Type: application/json
    Referer: https://localhost:9000/models/e2bde9b063a541008853eb4d9603fbf3
    Accept-Encoding: gzip, deflate, br
    Accept-Language: en-US,en;q=0.9
    Cookie: slycatauth=fa4387fcf4fe4070baea14195e708744; slycattimeout=timeout

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    X-Powered-By: Express
    content-length: 8
    expires: 0
    server: CherryPy/14.0.0
    pragma: no-cache
    cache-control: no-cache, no-store, must-revalidate
    date: Thu, 20 Jun 2019 17:31:36 GMT
    content-type: application/octet-stream
    connection: close

    ["V(2)"]
