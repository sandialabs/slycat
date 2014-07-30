.. _PUT Model Array:

PUT Model Array
===============
Description
-----------

Adds an array to an arrayset, ready to upload data.

Requests
--------

Syntax
^^^^^^

::

    PUT /models/(mid)/array-sets/(name)/arrays/(array)

Accepts
^^^^^^^

application/json

Preconditions
^^^^^^^^^^^^^

The named array set must already have been initialized with :ref:`PUT Model
Arrayset`.

Responses
---------

Returns
^^^^^^^

application/json

Examples
--------

Sample Request
^^^^^^^^^^^^^^

::

    PUT /models/6f48db3de2b6416091d31e93814a22ae/array-sets/test-array-set/arrays/0 HTTP/1.1
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

Sample Response
^^^^^^^^^^^^^^^

::

    HTTP/1.1 200 OK
    Date: Mon, 25 Nov 2013 20:36:07 GMT
    Content-Length: 4
    Content-Type: application/json
    Server: CherryPy/3.2.2

    null

See Also
--------

-  :ref:`PUT Model Arrayset`
-  :ref:`PUT Model Arrayset Data`

