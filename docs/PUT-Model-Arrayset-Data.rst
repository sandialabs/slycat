.. _PUT Model Arrayset Data:

PUT Model Arrayset Data
=======================
Description
-----------

Upload data to be stored as arrayset array attributes. The request may
contain data for one, many, or every array in the arrayset. Similarly,
the request may contain data for one, many, or every attribute of the
specified arrays.

Requests
--------

Syntax
^^^^^^

::

    PUT /models/(mid)/array-sets/(name)/data

Accepts
^^^^^^^

multipart/form-data

The request may contain an optional parameter "array" that specifies
which array(s) will receive data. The array parameter shall be a
comma-separated list of zero-based array slices using Python syntax
``begin:end:step``. As with Python, a single integer is interpreted as a
single array index and empty strings for "begin", "end", and "step" are
interpreted as "0", "number of arrays plus one", and "1" respectively.
If the "array" parameter isn't specified, it defaults to "::", i.e.
"every array in the arrayset".

The request may contain an optional parameter "attribute" that specifies
which attribute(s) of each array will receive data. The attribute
parameter shall be a comma-separated list of zero-based attribute slices
using Python syntax ``begin:end:step``. As with Python, a single integer
is interpreted as a single attribute index and empty strings for
"begin", "end", and "step" are interpreted as "0", "number of attributes
plus one", and "1" respectively. If the "attribute" parameter isn't
specified, it defaults to "::", i.e. "every attribute in the target
array".

The request may contain an optional parameter "hyperslice" that
specifies which range of elements within each array attribute will
receive data. The hyperslice parameter shall be a comma separated list
of half-open ranges, delimited with colons. If the hyperslice parameter
isn't specified, the request is assumed to set every value in the target
attributes.

The request may optionally contain a parameter "byteorder" that
specifies that the request data is binary data with the given
endianness. The byteorder parameter must be either "little" or "big". If
the byteorder parameter isn't specified, the request data must be
JSON-encoded arrays (arrays-of-arrays for multi-dimensional arrays).
Note that the byteorder parameter can only be used if every target
attribute of every array has a numeric type.

The request must contain a parameter "data" that contains the data to be
stored in array attributes.

Precondition
^^^^^^^^^^^^

The destination array(s) must have already been initialized with :ref:`PUT
Model Array`.

Examples
--------

Sample Request
^^^^^^^^^^^^^^

::

    PUT /models/25f1cdb62c34465286cecbaeccc1460d/array-sets/test-array-set/arrays/0/attributes/0 HTTP/1.1
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
    Content-Disposition: form-data; name="ranges"; filename="ranges"
    Content-Type: application/octet-stream

    [ [0, 5] ]
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

