.. _PUT Model Arrayset:

PUT Model Arrayset
==================
Description
-----------

Initialize an arrayset, a collection of zero-to-many arrays.

Requests
--------

Syntax
^^^^^^

::

    PUT /models/(mid)/array-sets/(name)

Accepts
^^^^^^^

application/json

Clients must provide a JSON request body with a boolean "input"
parameter.

Examples
--------

Sample Request
^^^^^^^^^^^^^^

::

    PUT /models/6f48db3de2b6416091d31e93814a22ae/array-sets/test-array-set HTTP/1.1
    Host: localhost:8093
    Content-Length: 2
    Accept-Encoding: gzip, deflate, compress
    Accept: */*
    User-Agent: python-requests/1.2.3 CPython/2.7.5 Linux/2.6.32-358.23.2.el6.x86_64
    content-type: application/json
    Authorization: Basic c2x5Y2F0OnNseWNhdA==

    { input : true }

Sample Response
^^^^^^^^^^^^^^^

::

    HTTP/1.1 200 OK
    Date: Mon, 25 Nov 2013 20:36:07 GMT
    Content-Length: 0
    Content-Type: text/html;charset=utf-8
    Server: CherryPy/3.2.2

See Also
--------

-  :ref:`PUT Model Array`
-  :ref:`PUT Model Arrayset Data`

