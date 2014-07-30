.. _GET Model Array Attribute Chunk:

GET Model Array Attribute Chunk
===============================
Description
-----------

Used to retrieve a chunk (hypercube) from an array artifact. The caller
specifies the arrayset, array, and attribute to return, and a half-open
range of coordinates along each dimension in the underlying array.

Two forms of request are supported: the first returns a numeric
attribute as a contiguous collection of bytes, in little-endian or
big-endian format and "C" order (last coordinate varies the fastest).
The second form returns an attribute in JSON format, and is the only way
to retrieve string attributes. Arraysets are specified by their name,
arrays and attributes are specified via their zero-based integer index.

Requests
--------

Syntax
^^^^^^

The first syntax is used to retrieve one numeric attribute within the
given range of coordinates, and must accept application/octet-stream as
the result content-type. The second syntax is used to retrieve one
string attribute within the given range of coordinates, and must accept
application/json as the result content-type:

::

    GET /models/(mid)/array-sets/(aid)/arrays/(array)/attributes/(attribute)/chunk?ranges=...&byteorder=...
    GET /models/(mid)/array-sets/(aid)/arrays/(array)/attributes/(attribute)/chunk?ranges=...

Accepts
^^^^^^^

Query string.

Responses
---------

Returns
^^^^^^^

application/octet-stream, application/json

Examples
--------

Sample Request
^^^^^^^^^^^^^^

::

    GET /models/b6afa2e2b5324e118d98b5f026f40624/array-sets/test-array-set/arrays/0/attributes/0/chunk?ranges=0,10 HTTP/1.1
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

    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

Sample Binary Request
^^^^^^^^^^^^^^^^^^^^^

::

    GET /models/6706e78890884845b6c709572a140681/array-sets/test-array-set/arrays/0/attributes/0/chunk?ranges=0,10&byteorder=little HTTP/1.1
    Host: localhost:8093
    Authorization: Basic c2x5Y2F0OnNseWNhdA==
    Accept-Encoding: gzip, deflate, compress
    accept: application/octet-stream
    User-Agent: python-requests/1.2.3 CPython/2.7.5 Linux/2.6.32-358.23.2.el6.x86_64

Sample Binary Response
^^^^^^^^^^^^^^^^^^^^^^

::

    HTTP/1.1 200 OK
    Date: Tue, 26 Nov 2013 16:40:04 GMT
    Content-Length: 80
    Content-Type: application/octet-stream
    Server: CherryPy/3.2.2

    ................................................................................

See Also
--------

-  :ref:`GET Model Array Metadata`

