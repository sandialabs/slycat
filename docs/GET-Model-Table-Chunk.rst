.. _GET Model Table Chunk:

GET Model Table Chunk
=====================
Description
-----------

Used to retrieve a chunk (subset of rows and columns) from a 1D arrayset
array artifact. Data is returned as a JSON array-of-arrays containing
column-oriented data, one array for each column specified in the
request. Both rows and columns may be specified using arbitrary
combinations of half-open ranges and individual indices. The ordering of
results (both rows and columns) always matches the order of rows and
columns in the request. Out-of-range rows or columns are ignored, in
which case the results will still contain in-range data. If the caller
specifies a name using the optional "index" query parameter in the
request, the response will be adjusted to include an additional index
column with the given name and zero-based row indices. The optional
"sort" query parameter can be used to return the results in sorted
order.

Requests
--------

Syntax
^^^^^^

::

    GET /models/(mid)/tables/(aid)/arrays/(array)/chunk?rows=...&columns=...&index=...&sort=...

Accepts
^^^^^^^

Query string.

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

    GET /models/6b3c85df433e499e9680a135cabe3ab2/tables/test-array-set/arrays/0/chunk?rows=0,1,2,3,4,5,6,7,8,9&columns=0 HTTP/1.1
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
    Content-Length: 138
    Content-Type: application/json
    Server: CherryPy/3.2.2

    {
      "sort": null,
      "column-names": ["int8"],
      "rows": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      "data": [ [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] ],
      "columns": [0]
    }

Complex Request
^^^^^^^^^^^^^^^

The following request retrieves rows [0, 10), 15, 16, and 17 and columns
[2, 5) and 8:

::

    GET /models/(mid)/tables/(aid)/arrays/(array)chunk?rows=0-10,15,16,17&columns=2-5,8

See Also
--------

-  :ref:`GET Model Table Metadata`
-  :ref:`GET Model Table Sorted Indices`
-  :ref:`GET Model Table Unsorted Indices`

