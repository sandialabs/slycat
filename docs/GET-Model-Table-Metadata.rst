.. _GET Model Table Metadata:

GET Model Table Metadata
========================
Description
-----------

Used to retrieve metadata from a 1D arrayset array artifact, optimized
for use as a table. The metadata for the table describes the number of
rows and columns in the table, the name and datatype of each column, and
the minimum and maximum values in each column. If the caller specifies a
name using the optional "index" query parameter in the request, the
response will be adjusted to include an additional index column with the
given name and zero-based row indices.

Requests
--------

Syntax
^^^^^^

::

    GET /models/(mid)/tables/(aid)/arrays/(array)/metadata?index=...

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

    GET /models/6b3c85df433e499e9680a135cabe3ab2/tables/test-array-set/arrays/0/metadata HTTP/1.1
    Host: localhost:8093
    Authorization: Basic c2x5Y2F0OnNseWNhdA==
    Accept-Encoding: gzip, deflate, compress
    accept: application/json
    User-Agent: python-requests/1.2.3 CPython/2.7.5 Linux/2.6.32-358.23.2.el6.x86_64

Sample Response
^^^^^^^^^^^^^^^

::

    HTTP/1.1 200 OK
    Date: Tue, 26 Nov 2013 16:40:16 GMT
    Content-Length: 395
    Content-Type: application/json
    Server: CherryPy/3.2.2

    {
      "column-types": ["int8", "int16", "int32", "int64", "uint8", "uint16", "uint32", "uint64", "float32", "float64", "string"],
      "column-min": [0, 0, 0, 0, 0, 0, 0, 0, 0.0, 0.0, "0"],
      "column-names": ["int8", "int16", "int32", "int64", "uint8", "uint16", "uint32", "uint64", "float32", "float64", "string"],
      "row-count": 10,
      "column-count": 11,
      "column-max": [9, 9, 9, 9, 9, 9, 9, 9, 9.0, 9.0, "9"]
    }

See Also
--------

-  :ref:`GET Model Table Chunk`
-  :ref:`GET Model Table Sorted Indices`
-  :ref:`GET Model Table Unsorted Indices`

