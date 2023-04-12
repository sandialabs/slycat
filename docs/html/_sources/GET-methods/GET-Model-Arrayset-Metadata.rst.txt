GET Model Arrayset Metadata
===========================

.. http:get:: /api/models/(mid)/arraysets/(aid)/metadata

  Used to retrieve metadata and statistics for an arrayset artifact - a
  collection of dense, multidimensional darray objects.  A darray is a dense,
  multi-dimensional, multi-attribute array, suitable for storage of arbitrarily-large
  data.

  The metadata for a single darray includes the name, type, half-open range of
  coordinate values, and shape for each dimension in the array, plus the name
  and type of each attribute.

  Statistics can be retrieved for individual darray attributes, and include
  minimum and maximum values, plus a count of unique values for an attribute.
  Although statistics are cached, retrieving them may be an extremely expensive
  operation, since they involve full scans through their respective attributes.
  Because of this, callers are encouraged to retrieve statistics only when
  needed.

  GET Model Arrayset Metadata can be called in two ways: without any query
  string, it will return an array containing metadata for every array in the
  arrayset, without any statistics.  Using the `arrays` argument, the caller
  can request metadata for an explicit list of arrays.  The `statistics`
  argument is used to request statistics for an explicit list of array
  attributes.  The `unique` argument is used to request unique values for an
  explicit list of array attributes.  The three arguments can be combined to
  retrieve arbitrary combinations of array metadata and attribute statistics in
  a single request.

  :param mid: Unique model identifier.
  :type mid: string

  :param aid: Arrayset artifact id.
  :type aid: string

  :query arrays: Optional, retrieve array metadata for a set of arrays specified in :ref:`hyperchunks` format.  Note that only the array part of the hyperchunk is used in this case - attributes and hyperslices, if provided, are ignored.
  :query statistics: Optional, retrive statistics for a set of array attributes specified in :ref:`hyperchunks` format.  Note that only the array and attribute parts of the hyperchunk is used in this case - hyperslices, if provided, are ignored.
  :query unique: Optional, retrieve unique values for a set of array attributes specified in :ref:`hyperchunks` format.  Note that you must provide a full hyperchunk with array, attribute, and hyperslice(s), and that the hyperslice(s) refer to ranges of unique values, not ranges of attribute values.  So a hyperchunk `0/1/:100` means "return the first 100 unique values in array 0, attribute 1".

  :responseheader Content-Type: application/json

  **Simple Request**

  .. sourcecode:: http

    GET /api/models/bbf6715c95a7481d8517a74a6154fbd1/arraysets/canonical-variables/metadata HTTP/1.1
    Host: localhost:9000
    Connection: keep-alive
    Accept: */*
    DNT: 1
    X-Requested-With: XMLHttpRequest
    User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36
    Content-Type: application/json
    Referer: https://localhost:9000/models/bbf6715c95a7481d8517a74a6154fbd1
    Accept-Encoding: gzip, deflate, br
    Accept-Language: en-US,en;q=0.9
    Cookie: InteractiveAnalysis=s%3A45eccdf7-653b-450a-8e84-59a27a9f00ad.IR0dNtd29mzKa0RaqXVz91uH3QGcVKbIOeoX%2FJyQ1Wo; slycatauth=b10421f92cc24a819dbe4df9ae63571c; slycattimeout=timeout

  **Simple Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    X-Powered-By: Express
    content-length: 277
    expires: 0
    server: CherryPy/14.0.0
    pragma: no-cache
    cache-control: no-cache, no-store, must-revalidate
    date: Wed, 19 Jun 2019 18:12:48 GMT
    content-type: application/json
    connection: close

    [
      {
        "index": 0,
        "attributes":
        [
          {"type": "float64", "name": "correlation"}
        ],
        "dimensions":
        [
          {"end": 3, "begin": 0, "type": "int64", "name": "component"},
          {"end": 5, "begin": 0, "type": "int64", "name": "input"}
        ],
        "shape":
        [
          3, 5
        ],
      }
    ]

  **Complex Request**

  .. sourcecode:: http

    GET /api/models/e97077e27af141d6a06f17c9eed6c17a/arraysets/foo/metadata?arrays=0%3b1&statistics=0/0%3b0/1 HTTP/1.1
    Host: localhost:9000
    Connection: keep-alive
    Accept: */*
    DNT: 1
    X-Requested-With: XMLHttpRequest
    User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36
    Content-Type: application/json
    Referer: https://localhost:9000/models/bbf6715c95a7481d8517a74a6154fbd1
    Accept-Encoding: gzip, deflate, br
    Accept-Language: en-US,en;q=0.9
    Cookie: InteractiveAnalysis=s%3A45eccdf7-653b-450a-8e84-59a27a9f00ad.IR0dNtd29mzKa0RaqXVz91uH3QGcVKbIOeoX%2FJyQ1Wo; slycatauth=b10421f92cc24a819dbe4df9ae63571c; slycattimeout=timeout

  **Complex Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    X-Powered-By: Express
    content-length: 277
    expires: 0
    server: CherryPy/14.0.0
    pragma: no-cache
    cache-control: no-cache, no-store, must-revalidate
    date: Wed, 19 Jun 2019 18:12:48 GMT
    content-type: application/json
    connection: close

    {
      "arrays":
      [
        {
          "index": 0,
          "attributes":
          [
            {"type": "float64", "name": "weight"}
            {"type": "string", "name": "animal"}
          ],
          "dimensions":
          [
            {"end": 10, "begin": 0, "type": "int64", "name": "i"},
          ],
          "shape":
          [
            10,
          ],
        },
        {
          "index": 1,
          "attributes":
          [
            {"type": "float64", "name": "c"}
            {"type": "float64", "name": "d"}
          ],
          "dimensions":
          [
            {"end": 10, "begin": 0, "type": "int64", "name": "i"},
          ],
          "shape":
          [
            10,
          ],
        }
      ],
      "statistics":
      [
        {
          "array": 0,
          "attribute": 0,
          "min": 0.1,
          "max": 1237.3,
          "unique": 3704,
        },
        {
          "array": 0,
          "attribute": 1,
          "min": "aardvark",
          "max": "zebra",
          "unique": 4,
        }
      ]
    }

See Also
--------

- :ref:`hyperchunks`
- :http:get:`/api/models/(mid)/arraysets/(aid)/data`
- :http:put:`/api/models/(mid)/arraysets/(aid)/data`

