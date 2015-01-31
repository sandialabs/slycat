GET Bookmark
============

.. http:get:: /bookmarks/(bid)

  Retrieves a bookmark - an arbitrary collection of client state.

  :param bid: Unique bookmark identifier.
  :type bid: string

  :responseheader Content-Type: application/json

  **Sample Request**

  .. sourcecode:: http

    GET /bookmarks/da47466b64216fbb5f782bc2487ceed0 HTTP/1.1
    Host: localhost:8092
    Authorization: Basic c2x5Y2F0OnNseWNhdA==
    Accept-Encoding: gzip, deflate, compress
    Accept: */*
    User-Agent: python-requests/1.2.0 CPython/2.7.3 Linux/2.6.32-358.6.1.el6.x86_64

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    Date: Thu, 25 Apr 2013 21:33:51 GMT
    Content-Length: 40
    Content-Type: application/json
    Server: CherryPy/3.2.2

    {"selected-column":34,"selected-row":13}

See Also
--------

-  :http:post:`/projects/(pid)/bookmarks`

