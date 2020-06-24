PUT Model Arrayset Data
=======================

.. http:put:: /api/models/(mid)/arraysets/(aid)/data

  Upload data to be stored in arrayset array attributes. The request may
  contain data to be stored in any combinations of arrays, attributes, and
  hyperslices.  The destination array(s) must have already been initialized
  with :http:put:`/api/models/(mid)/arraysets/(aid)/arrays/(array)`.

  :param mid: Unique model identifier.
  :type mid: string

  :param aid: Unique artifact id.
  :type aid: string

  :requestheader Content-Type: multipart/form-data

  :form hyperchunks:

    (Required) The arrays, attributes, and hyperslices to be overwritten, in :ref:`hyperchunks` format.

  :form byteorder:

    (Optional) Specifies that the request contains binary data with the given endianness.

    The byteorder parameter must be either "little" or "big".  Note that the
    byteorder parameter can only be used if every attribute in every hyperchunk
    is of numeric type.

  :form data:

    (Required) The data to be stored.

    If the byteorder is specified, the request data must contain contiguous raw
    data bytes in the given byteorder, in the same order as the hyperchunks /
    hyperslices.  For multi-dimension arrays, hyperslice array elements must be
    in "C" order.

    If the byteorder parameter isn't specified, the request data must contain a
    JSON-encoded array with length equal to the total number of hyperslices.  Each
    element in this top level array must be an array containing the data for the
    corresponding hyperslice, in the same order as the hyperchunks / hyperslices.
    For multi-dimension arrays, data for the corresponding hyperslice will be
    nested further.

  **Sample Request**

  The following request would write data in binary format to the following locations:

  * Element number 5 in vector array 0, attribute 1
  * A half-open range of elements [10-20) in vector array 2, attribute 3
  * A 4x4 subset of elements in matrix array 4, attribute 5
  * Elements [0-10) and [20-30) in vector array 6, attribute 7

  .. sourcecode:: http

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

  **Sample Response**

  .. sourcecode:: http

      HTTP/1.1 200 OK
      Date: Tue, 26 Nov 2013 16:40:05 GMT
      Content-Length: 4
      Content-Type: application/json
      Server: CherryPy/3.2.2

      null

See Also
--------

- :ref:`hyperchunks`
- :http:put:`/api/models/(mid)/arraysets/(aid)`
- :http:put:`/api/models/(mid)/arraysets/(aid)/arrays/(array)`

