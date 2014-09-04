.. _GET Model Arrayset:

GET Model Arrayset
==================
Description
-----------

Used to retrieve multiple arrays from an arrayset artifact. The caller
specifies the arrayset and an optional range of arrays to be returned.
If no range is specified, every attribute of every array in the arrayset
will be returned.

The request returns array attributes as a contiguous collection of
bytes, in little-endian or big-endian format and "C" order (last
coordinate varies the fastest). Thus, this request can only be used if
every attribute of every array requested contains numeric (not string)
data.

Requests
--------

Syntax
^^^^^^

The request must accept application/octet-stream as the result
content-type, and must specify either ``byteorder=little`` or
``byteorder=big``. The request may specify the range of arrays to be
returned using Python slicing syntax: ``arrays=begin:end:step``. As with
Python, any of begin, end, and step may be omitted, defaulting to the
first array in the arrayset, the last array in the arrayset, and ``1``
respectively. Indices may be negative, in which case they count
backwards from the end of the array. If the arrays parameter isn't
specified, all arrays will be returned.

::

    GET /models/(mid)/arraysets/(aid)?byteorder=...&arrays=...

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

::

    GET /models/6706e78890884845b6c709572a140681/arraysets/test-array-set?byteorder=little HTTP/1.1
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

See Also
--------

-  :ref:`GET Model Arrayset Metadata`

