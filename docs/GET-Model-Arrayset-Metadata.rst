GET Model Arrayset Metadata
===========================

.. http:get:: /models/(mid)/arraysets/(name)/metadata

  Used to retrieve metadata and statistics for an arrayset artifact - a
  collection of dense, multidimensional darray objects.  A darray is a dense,
  multi-dimensional, multi-attribute array, suitable for storage of arbitrarily-large
  data.

  The metadata for a single darray includes the name, type, and half-open range
  of coordinate values for each dimension in the array, plus the name and
  type of each attribute.

  Statistics can be retrieved for individual darray attributes, and include
  minimum and maximum values for that attribute.  Although statistics are cached,
  retrieving them may be an extremely expensive operation, since they involve
  full scans through their respective attributes.  Because of this, callers are
  encouraged to retrieve statistics only when needed.

  GET Model Arrayset Metadata can be called in two ways: without any query string,
  it will return an array containing metadata for every array in the arrayset,
  without any statistics.  With the `arrays` argument, the caller can request
  metadata for an explicit list of semicolon-delimited array indices.  With the
  `statistics` argument, the caller can request statistics for an explicit list
  of semicolon-delimited array-attribute pairs separated by forward slashes.  The
  two arguments can be combined to retrieve arbitrary combinations of array
  metadata and attribute statistics in a single request.

  .. note::
      Semicolons must be encoded in browser query strings!

  :param mid: Unique model identifier.
  :type mid: string

  :param name: Arrayset artifact name.
  :type name: string

  :query arrays: Optional semicolon-delimited list of integer array indices.
  :query statistics: Optional semicolon-delimited list of integer array-attribute pairs separated by forward slashes.

  :responseheader Content-Type: application/json

  **Simple Request**

  .. sourcecode:: http

    GET /models/e97077e27af141d6a06f17c9eed6c17a/arraysets/canonical-variables/metadata HTTP/1.1
    Host: localhost:8092
    Authorization: Basic c2x5Y2F0OnNseWNhdA==
    Accept-Encoding: gzip, deflate, compress
    Accept: application/json
    User-Agent: python-requests/1.2.0 CPython/2.7.3 Linux/2.6.32-358.6.2.el6.x86_64

  **Simple Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    Date: Tue, 11 Jun 2013 19:00:50 GMT
    Content-Length: 195
    Content-Type: application/json
    Server: CherryPy/3.2.2

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
          {"end": 3, "begin": 0, "type": "int64", "name": "input"}
        ]
      }
    ]

  **Complex Request**

  .. sourcecode:: http

    GET /models/e97077e27af141d6a06f17c9eed6c17a/arraysets/foo/metadata?arrays=0%3b1&statistics=0/0%3b0/1 HTTP/1.1
    Host: localhost:8092
    Authorization: Basic c2x5Y2F0OnNseWNhdA==
    Accept-Encoding: gzip, deflate, compress
    Accept: application/json
    User-Agent: python-requests/1.2.0 CPython/2.7.3 Linux/2.6.32-358.6.2.el6.x86_64

  **Complex Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    Date: Tue, 11 Jun 2013 19:00:50 GMT
    Content-Length: 195
    Content-Type: application/json
    Server: CherryPy/3.2.2

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
          ]
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
          ]
        }
      ],
      "statistics":
      [
        {
          "array": 0,
          "attribute": 0,
          "min": 0.1,
          "max": 1237.3,
        },
        {
          "array": 0,
          "attribute": 1,
          "min": "aardvark",
          "max": "zebra",
        }
      ]
    }

See Also
--------

- :http:get:`/models/(mid)/arraysets/(name)/data`
- :http:put:`/models/(mid)/arraysets/(name)/data`

