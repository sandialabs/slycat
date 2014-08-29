.. _PUT Model Arrayset Data:

PUT Model Arrayset Data
=======================

Description
-----------

Upload data to be stored in arrayset array attributes. The request may
contain data to be stored in any combinations of arrays, attributes, and
hyperslices.

Requests
--------

Syntax
^^^^^^

::

    PUT /models/(mid)/arraysets/(name)/data

Accepts
^^^^^^^

multipart/form-data

The request must contain a parameter `hyperchunks` that
specifies the arrays, attributes, and hyperslices to be overwritten.
The `hyperchunks` parameter shall be a semicolon-separated list
of one-or-more hyperchunks.  Each hyperchunk will contain an array index, attribute
index, and list of hyperslices, separated by forward slashes.  The array
index and attribute index must be non-negative integers.  The list of hyperslices
will contain one-or-more hyperslices, separated by vertical bars.  Each hyperslice
will contain one-or-more slice dimensions, separated by commas.  Each slice dimension
may be an integer, a colon-delimited start:stop:step range, or an ellipsis ("...").
Any part of the colon-delimited start:stop:step range may be omitted.

The request may optionally contain a parameter `byteorder` that specifies that
the request data is binary data with the given endianness. The byteorder
parameter must be either "little" or "big".  Note that the byteorder parameter
can only be used if every attribute in every hyperchunk is of numeric type.

The request must contain a file parameter "data" that contains the data to be
stored in array attributes. If the byteorder parameter isn't specified, the
request data must contain a JSON-encoded array with length equal to the number
of hyperchunks.  Each element in the hyperchunk array must be an array with
length equal to the number of hyperslices in the corresponding hyperchunk.
Each element in the hyperslice array must be an array containing the
corresponding data (the arrays will be nested further to represent data with
dimension > 1).

Precondition
^^^^^^^^^^^^

The destination array(s) must have already been initialized with :ref:`PUT
Model Arrayset Array`.

Examples
--------

Sample Request
^^^^^^^^^^^^^^

The following request would write data in binary format to the following locations:

* Element number 5 in vector array 0, attribute 1
* A half-open range of elements [10-20) in vector array 2, attribute 3
* A 4x4 subset of elements in matrix array 4, attribute 5
* Elements [0-10) and [20-30) in vector array 6, attribute 7

::

    PUT /models/25f1cdb62c34465286cecbaeccc1460d/arraysets/test-array-set/data HTTP/1.1
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
    Content-Disposition: form-data; name="hyperchunks"

    0/1/5;2/3/10:20;4/5/0:4,0:4;6/7/0:10|20:30
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
-  :ref:`PUT Model Arrayset Array`

