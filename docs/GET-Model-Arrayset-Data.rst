.. _GET Model Arrayset Data:

GET Model Arrayset Data
=======================
Description
-----------

Retrieve data stored in arrayset darray attributes.  The caller may request
data stored using any combination of arrays, attributes, and hyperslices.

Requests
--------

Syntax
^^^^^^

The request must contain a parameter `hyperchunks` that
specifies the arrays, attributes, and hyperslices to be returned.
The `hyperchunks` parameter shall be a semicolon-separated list
of one-or-more hyperchunks.  Each hyperchunk will contain an array index, attribute
index, and list of hyperslices, separated by forward slashes.  The array
index and attribute index must be non-negative integers.  The list of hyperslices
will contain one-or-more hyperslices, separated by vertical bars.  Each hyperslice
will contain one-or-more slice dimensions, separated by commas.  Each slice dimension
may be an integer, a colon-delimited start:stop:step range, or an ellipsis ("...").
When specifying ranges, the :step may be omitted, in which case the step defaults
to `1`.  If the start value is omitted (empty string), the start value defaults to
`0`.  If the stop value is omitted (empty string), the stop value defaults to the
end of the corresponding array dimension.  So for example:

* `0:10:2` - specifies even numbered indices `0, 2, 4, 6, 8`.
* `0:10` - specifies indices `0, 1, 2, 3, 4, 5, 6, 7, 8, 9`.
* `:5` - specifies indices `0, 1, 2, 3, 4`.
* `4:` - specifies indices from `4` through the end of the array dimension.
* `:` - specifies every index in the array dimension.
* `::3` - specifies every third index in the array dimension, starting at `0`.
* `1::3` - specifies every third index in the array dimension, starting at `1`.

The request may optionally contain a parameter `byteorder` that specifies that
the request data is binary data with the given endianness. The byteorder
parameter must be either "little" or "big".  Note that the byteorder parameter
can only be used if every attribute in every hyperchunk is of numeric type.  If
the byteorder parameter is used, the request must accept
application/octet-stream as the result content-type, and the returned data will
contain contiguous raw data bytes in the given byteorder, in the same order as
the hyperchunks / hyperslices.  For multi-dimension arrays, hyperslice array
elements will be in "C" order (the last coordinate varies the fastest).

If the byteorder parameter isn't specified, the result data will be a
JSON-encoded array with length equal to the total number of hyperslices.  Each
element in this top level array will be an array containing the data for the
corresponding hyperslice, in the same order as the hyperchunks / hyperslices.
For multi-dimension arrays, data for the corresponding hyperslice will be
nested further.

::

    GET /models/(mid)/arraysets/(aid)/data?hyperchunks=...&byteorder=...

Accepts
^^^^^^^

Query string.

Responses
---------

Returns
^^^^^^^

application/octet-stream or application/json

Examples
--------

The following request will return all of the data for array 0, attribute 1 from
an arrayset artifact named "foo":

Sample Request
^^^^^^^^^^^^^^

::

    GET /models/6706e78890884845b6c709572a140681/arraysets/foo/data?hyperchunks=0/1/...&byteorder=little HTTP/1.1
    Host: localhost:8093
    Authorization: Basic c2x5Y2F0OnNseWNhdA==
    Accept-Encoding: gzip, deflate, compress
    accept: application/octet-stream
    User-Agent: python-requests/1.2.3 CPython/2.7.5 Linux/2.6.32-358.23.2.el6.x86_64

Sample Response
^^^^^^^^^^^^^^^

::

    HTTP/1.1 200 OK
    Date: Tue, 26 Nov 2013 16:40:04 GMT
    Content-Length: 80
    Content-Type: application/octet-stream
    Server: CherryPy/3.2.2

    ................................................................................

