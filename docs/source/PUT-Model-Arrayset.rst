PUT Model Arrayset
==================

.. http:put:: /api/models/(mid)/arraysets/(aid)

  Initialize an arrayset, a collection of zero-to-many arrays.

  :param mid: Unique model identifier.
  :type mid: string

  :param aid: Unique artifact id.
  :type aid: string

  :requestheader Content-Type: application/json

  :<json bool input: Set to true if this arrayset is a model input.

  **Sample Request**

  .. sourcecode:: http

    PUT /models/6f48db3de2b6416091d31e93814a22ae/arraysets/test-array-set HTTP/1.1
    Host: localhost:8093
    Content-Length: 2
    Accept-Encoding: gzip, deflate, compress
    Accept: */*
    User-Agent: python-requests/1.2.3 CPython/2.7.5 Linux/2.6.32-358.23.2.el6.x86_64
    content-type: application/json
    Authorization: Basic c2x5Y2F0OnNseWNhdA==

    { input : true }

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    Date: Mon, 25 Nov 2013 20:36:07 GMT
    Content-Length: 0
    Content-Type: text/html;charset=utf-8
    Server: CherryPy/3.2.2

See Also
--------

- :http:put:`/api/models/(mid)/arraysets/(aid)/arrays/(array)`
- :http:put:`/api/models/(mid)/arraysets/(aid)/data`

