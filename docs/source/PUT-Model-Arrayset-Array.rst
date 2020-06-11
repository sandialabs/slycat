PUT Model Arrayset Array
========================

.. http:put:: /models/(mid)/arraysets/(aid)/arrays/(array)

  Adds an array to an arrayset, ready to upload data.  The arrayset must
  already have been initialized with :http:put:`/models/(mid)/arraysets/(aid)`.

  :param mid: Unique model identifier.
  :type mid: string

  :param aid: Unique artifact id.
  :type aid: string

  :param array: Unique array index.
  :type array: int

  :requestheader Content-Type: application/json

  :<json object attributes: New array attributes.
  :<json object dimensions: New array dimensions.

  **Sample Request**

  .. sourcecode:: http

    PUT /models/6f48db3de2b6416091d31e93814a22ae/arraysets/test-array-set/arrays/0 HTTP/1.1
    Host: localhost:8093
    Content-Length: 203
    Accept-Encoding: gzip, deflate, compress
    Accept: */*
    User-Agent: python-requests/1.2.3 CPython/2.7.5 Linux/2.6.32-358.23.2.el6.x86_64
    content-type: application/json
    Authorization: Basic c2x5Y2F0OnNseWNhdA==

    {
      "attributes": [
        {"type": "int64", "name": "integer"},
        {"type": "float64", "name": "float"},
        {"type": "string", "name": "string"}],
     "dimensions": [
        {"end": 10, "begin": 0, "type": "int64", "name": "row"}]
    }

  **Sample Response**

  .. sourcecode:: http

      HTTP/1.1 200 OK
      Date: Mon, 25 Nov 2013 20:36:07 GMT
      Content-Length: 4
      Content-Type: application/json
      Server: CherryPy/3.2.2

      null

See Also
--------

- :http:put:`/models/(mid)/arraysets/(aid)`
- :http:put:`/models/(mid)/arraysets/(aid)/data`

