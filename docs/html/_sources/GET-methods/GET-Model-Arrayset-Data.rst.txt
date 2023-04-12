GET Model Arrayset Data
=======================

.. http:get:: /api/models/(mid)/arraysets/(aid)/data

  Retrieve data stored in arrayset darray attributes.  The caller may request
  data stored using any combination of arrays, attributes, and hyperslices.

  :param mid: Unique model identifier.
  :type mid: string

  :param aid: Arrayset artifact id.
  :type aid: string

  :query hyperchunks:

    The request must contain a parameter `hyperchunks` that
    specifies the arrays, attributes, and hyperslices to be returned, in :ref:`hyperchunks` format.

  :query byteorder:

    The request may optionally contain a parameter `byteorder` that specifies
    that the response should be binary data with the given endianness. The
    byteorder parameter must be either "little" or "big".  Note that the
    byteorder parameter can only be used if every attribute in every hyperchunk
    is of numeric type.  If the byteorder parameter is used, the request must
    accept application/octet-stream as the result content-type, and the
    response data will contain contiguous raw data bytes in the given
    byteorder, in the same order as the requested hyperchunks / hyperslices.
    For multi-dimension arrays, hyperslice array elements will be in "C" order
    (the last coordinate varies the fastest).

    If the byteorder parameter isn't specified, the response data will be a
    JSON-encoded array with length equal to the total number of hyperslices.
    Each element in this top level array will be an array containing the data
    for the corresponding hyperslice, in the same order as the requested
    hyperchunks / hyperslices.  For multi-dimension arrays, data for the
    corresponding hyperslice will be nested further, in "C" order (the last
    coordinate varies the fastest).

  :responseheader Content-Type: application/octet-stream or application/json

  The following request will return all of the data for array 0, attribute 1 from
  an arrayset artifact with id "foo":

  **Sample Request**

  .. sourcecode:: http

    GET /api/models/05a06c0fa9cc40fc9d10087340425379/arraysets/input-structure-correlation/data?hyperchunks=0/0/0:6|0:7&byteorder=little HTTP/1.1
    Host: localhost:9000
    Connection: keep-alive
    User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36
    DNT: 1
    Accept: */*
    Referer: https://localhost:9000/models/05a06c0fa9cc40fc9d10087340425379
    Accept-Encoding: gzip, deflate, br
    Accept-Language: en-US,en;q=0.9
    Cookie: InteractiveAnalysis=s%3A45eccdf7-653b-450a-8e84-59a27a9f00ad.IR0dNtd29mzKa0RaqXVz91uH3QGcVKbIOeoX%2FJyQ1Wo; slycatauth=b10421f92cc24a819dbe4df9ae63571c; slycattimeout=timeout

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    X-Powered-By: Express
    expires: 0
    server: CherryPy/14.0.0
    pragma: no-cache
    cache-control: no-cache, no-store, must-revalidate
    date: Wed, 19 Jun 2019 17:35:35 GMT
    content-type: application/octet-stream
    transfer-encoding: chunked
    connection: close

    ................................................................................

See Also
--------

- :ref:`hyperchunks`
- :http:get:`/api/models/(mid)/arraysets/(aid)/metadata`
- :http:put:`/api/models/(mid)/arraysets/(aid)/data`

