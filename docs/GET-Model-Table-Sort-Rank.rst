.. _GET Model Table Sort Rank:

GET Model Table Sort Rank
=========================
Description
-----------

Used to convert unsorted table artifact row indices into sorted row
indices. The results will contain an array of indices. The indices to be
converted may be specified using arbitrary combinations of half-open
ranges and individual indices. Out-of-range indices are ignored, in
which case the results will still contain in-range indices.

Requests
--------

Syntax
^^^^^^

::

    GET /models/(mid)/artifact/(aid)/table-sort-rank?rows=...&index=...&sort=...&byteorder=...

Accepts
^^^^^^^

Query string.

Responses
---------

Returns
^^^^^^^

application/octet-stream

Examples
--------

Sample Request
^^^^^^^^^^^^^^

The following request retrieves the indices for rows 0-100 if column 5
is sorted in ascending order.

::

    GET /models/43458f5f643a49d2af0927d006f85610/artifacts/data-table/table-row-indices?rows=0-100&sort=5:ascending HTTP/1.1
    Host: localhost:8092
    Authorization: Basic c2x5Y2F0OnNseWNhdA==
    Accept-Encoding: gzip, deflate, compress
    Accept: */*
    User-Agent: python-requests/1.2.0 CPython/2.7.3 Linux/2.6.32-358.6.1.el6.x86_64

Sample Response
^^^^^^^^^^^^^^^

The response will contain a set of "rows" that echo the requested range,
and a set of "sorted-rows" containing the corresponding rows.

::

    HTTP/1.1 200 OK
    Date: Tue, 30 Apr 2013 21:47:49 GMT
    Content-Length: 72
    Content-Type: application/json
    Server: CherryPy/3.2.2

    ...

See Also
--------

-  :ref:`GET Model Table Metadata`
-  :ref:`GET Model Table Chunk`

