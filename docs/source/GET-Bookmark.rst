GET Bookmark
============

.. http:get:: /api/bookmarks/(bid)

  Retrieves a bookmark - an arbitrary collection of client state represented as json.

  :param bid: Unique bookmark identifier.
  :type bid: json string

  :responseheader Content-Type: application/json

  **Sample Request**

  .. sourcecode:: http

    GET /api/bookmarks/405d84f7553f53736beabdf874d55356 HTTP/1.1
    Host: localhost:9000
    Connection: keep-alive
    Accept: application/json, text/javascript, */*; q=0.01
    DNT: 1
    X-Requested-With: XMLHttpRequest
    User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.80 Safari/537.36
    Referer: https://localhost:9000/models/b26d9a5d7b2f44729bffccad51fdfcf9?bid=405d84f7553f53736beabdf874d55356
    Accept-Encoding: gzip, deflate, br
    Accept-Language: en-US,en;q=0.9
    Cookie: slycatauth=e9528234ede94e159fc21ef2f744323f; slycattimeout=timeout

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    X-Powered-By: Express
    content-length: 43
    expires: 0
    server: CherryPy/14.0.0
    pragma: no-cache
    cache-control: no-cache, no-store, must-revalidate
    date: Fri, 14 Jun 2019 19:41:58 GMT
    content-type: application/json
    connection: close

    {"selected-column":34,"selected-row":13}

See Also
--------

-  :http:post:`/api/projects/(pid)/bookmarks`

