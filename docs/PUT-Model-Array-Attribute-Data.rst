.. _PUT Model Array Attribute Data:

PUT Model Array Attribute Data
==============================

Description
-----------

Upload data to be stored in an array attribute. The request may contain data
for one-or-more discontiguous hyperslices within the given attribute.

Requests
--------

Syntax
^^^^^^

::

    PUT /models/(mid)/array-sets/(name)/arrays/(array)/attributes/(attribute)/data

Accepts
^^^^^^^

multipart/form-data

The request may contain a `hyperslices` parameter that specifies one-or-more
hyperslices within the array attribute that will receive data.  The hyperslice
parameter shall be a comma separated list of hyperslices, where each hyperslice
is specified using Python slice notation: an integer, colon-delimited slice,
ellipsis, or a comma separated list of integers, slices, and ellipses in
parentheses.  If the `hyperslices` parameter is omitted, a single hyperslice
covering the entire attribute is assumed.

The request may optionally contain a parameter `byteorder` that
specifies that the request data is binary data with the given
endianness. The byteorder parameter must be either *little* or *big*. If
the byteorder parameter isn't specified, the request data must be
a JSON-encoded array containing nested-array data for each hyperslice.
Note that the byteorder parameter cannot be used if the target attribute
is a non-numeric type.

The request must contain a parameter "data" that contains the data to be
stored.

Precondition
^^^^^^^^^^^^

The destination array must have already been initialized with :ref:`PUT
Model Array`.

Examples
--------

Sample Request
^^^^^^^^^^^^^^

::

    PUT /models/25f1cdb62c34465286cecbaeccc1460d/array-sets/test-array-set/arrays/0/attributes/0/data HTTP/1.1
    Host: localhost:8093
    Content-Length: 470
    Accept-Encoding: gzip, deflate, compress
    Accept: */*
    User-Agent: python-requests/1.2.3 CPython/2.7.5 Linux/2.6.32-358.23.2.el6.x86_64
    Content-Type: multipart/form-data; boundary=573af150d64b4d70b35689f41c136ed3
    Authorization: Basic c2x5Y2F0OnNseWNhdA==

    --573af150d64b4d70b35689f41c136ed3
    Content-Disposition: form-data; name="byteorder"

    little
    --573af150d64b4d70b35689f41c136ed3
    Content-Disposition: form-data; name="hyperslices"

    3,8,10:20
    --573af150d64b4d70b35689f41c136ed3
    Content-Disposition: form-data; name="data"; filename="data"
    Content-Type: application/octet-stream

    ........................................
    --573af150d64b4d70b35689f41c136ed3--

Sample Response
^^^^^^^^^^^^^^^

::

    HTTP/1.1 200 OK
    Date: Tue, 26 Nov 2013 16:40:05 GMT
    Content-Length: 4
    Content-Type: application/json
    Server: CherryPy/3.2.2

    null

See Also
--------

-  :ref:`PUT Model Arrayset`
-  :ref:`PUT Model Array`

