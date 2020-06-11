POST Model Arrayset Data
========================

.. http:get:: /models/(mid)/arraysets/(aid)/data

  Retrieve data stored in arrayset darray attributes.  The caller may request
  data stored using any combination of arrays, attributes, and hyperslices.

  :param mid: Unique model identifier.
  :type mid: string

  :param aid: Arrayset artifact id.
  :type aid: string

  :requestheader Content-Type: application/json

  :<json string hyperchunks:
    The request must contain a parameter `hyperchunks` that
    specifies the arrays, attributes, and hyperslices to be returned, in :ref:`hyperchunks` format.

  :<json string byteorder:

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
  :responseheader Content-Type: application/json

  The following request will return all of the data for array 0, attribute 1 from
  an arrayset artifact with id "foo":

  **Sample Request**

  .. sourcecode:: http

    POST /models/6706e78890884845b6c709572a140681/arraysets/foo/dataH TTP/1.1
    Host: localhost:8093
    Authorization: Basic c2x5Y2F0OnNseWNhdA==
    Accept-Encoding: gzip, deflate, compress
    accept: application/octet-stream
    User-Agent: python-requests/1.2.3 CPython/2.7.5 Linux/2.6.32-358.23.2.el6.x86_64

    {
        hyperchunks: "0/1/...,"
        byteorder: "little"
    }

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    Date: Tue, 26 Nov 2013 16:40:04 GMT
    Content-Length: 80
    Content-Type: application/octet-stream
    Server: CherryPy/3.2.2

    ................................................................................

See Also
--------

- :ref:`hyperchunks`
- :http:get:`/models/(mid)/arraysets/(aid)/metadata`
- :http:put:`/models/(mid)/arraysets/(aid)/data`
