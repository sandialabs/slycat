.. _GET Model Array Attribute Statistics:

GET Model Array Attribute Statistics
====================================
Description
-----------

Used to retrieve statistics describing a darray attribute. The caller specifies
the arrayset, array, and attribute to be described.  The statistics are
returned in JSON format.  Arraysets are specified by their name, arrays and
attributes are specified via their zero-based integer index.

Requests
--------

Syntax
^^^^^^

Requests must accept application/json as the result content-type:

::

    GET /models/(mid)/arraysets/(aid)/arrays/(array)/attributes/(attribute)/statistics

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

    GET /models/b6afa2e2b5324e118d98b5f026f40624/arraysets/test-array-set/arrays/0/attributes/0/statistics HTTP/1.1
    Host: localhost:8093
    Authorization: Basic c2x5Y2F0OnNseWNhdA==
    Accept-Encoding: gzip, deflate, compress
    accept: application/json
    User-Agent: python-requests/1.2.3 CPython/2.7.5 Linux/2.6.32-358.23.2.el6.x86_64

Sample Response
^^^^^^^^^^^^^^^

::

    HTTP/1.1 200 OK
    Date: Mon, 25 Nov 2013 20:36:12 GMT
    Content-Length: 30
    Content-Type: application/json
    Server: CherryPy/3.2.2

    {"min":0, "max":9}

    ................................................................................

See Also
--------

-  :ref:`GET Model Array Metadata`
-  :ref:`GET Model Array Attribute Chunk`

