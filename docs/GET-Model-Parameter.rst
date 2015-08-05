GET Model Parameter
===================

.. http:get:: /models/(mid)/parameters/(aid)

  Retrieves a model parameter (name / value pair) artifact. The result is a
  JSON expression and may be arbitrarily complex.

  :param mid: Unique model identifier.
  :type mid: string

  :param aid: Parameter artifact id.
  :type aid: string

  :responseheader Content-Type: application/json

  **Sample Request**

  .. sourcecode:: http

    GET /models/1385a75dd2eb4faba884cefdd0b94a56/parameters/baz HTTP/1.1
    Host: localhost:8093
    Content-Length: 0
    Accept-Encoding: gzip, deflate, compress
    Accept: */*
    User-Agent: python-requests/1.2.3 CPython/2.7.5 Linux/2.6.32-358.23.2.el6.x86_64
    Authorization: Basic c2x5Y2F0OnNseWNhdA==

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    Date: Mon, 25 Nov 2013 20:36:04 GMT
    Content-Length: 20
    Content-Type: application/json
    Server: CherryPy/3.2.2

    {
      value : [1, 2, 3],
      input : true
    }

See Also
--------

- :http:put:`/models/(mid)/parameters/(aid)`

