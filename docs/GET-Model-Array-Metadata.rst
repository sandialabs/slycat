.. _GET Model Array Metadata:

GET Model Array Metadata
========================
Description
-----------

Used to retrieve array metadata from a model array artifact - useful for
providing interactive, incremental access to arbitrarily-large
multidimensional arrays.

An array artifact is modelled using one-to-many dimensions and
one-to-many attributes. Dimensions define the structure of "cells" in an
array, while attributes are strongly-typed values that are defined for
every cell within the array. Thus, a linear algebra matrix would be
represented as a 2D array with dimensions for row and column, with a
single floating-point attribute to store the matrix values. A collection
of points in the plane might be stored as a 1D array with two
attributes, one each for X and Y coordinates.

The metadata for an array includes the name, type, and half-open range
of coordinate values for each dimension in the array, plus the name and
type of each attribute.

Requests
--------

Syntax
^^^^^^

::

    GET /models/(mid)/arraysets/(aid)/arrays/(array)/metadata

Responses
---------

Returns
^^^^^^^

application/json

Examples
--------

Sample Request
^^^^^^^^^^^^^^

::

    GET /models/e97077e27af141d6a06f17c9eed6c17a/arraysets/canonical-variables/arrays/0/metadata HTTP/1.1
    Host: localhost:8092
    Authorization: Basic c2x5Y2F0OnNseWNhdA==
    Accept-Encoding: gzip, deflate, compress
    Accept: application/json
    User-Agent: python-requests/1.2.0 CPython/2.7.3 Linux/2.6.32-358.6.2.el6.x86_64

Sample Response
^^^^^^^^^^^^^^^

::

    HTTP/1.1 200 OK
    Date: Tue, 11 Jun 2013 19:00:50 GMT
    Content-Length: 195
    Content-Type: application/json
    Server: CherryPy/3.2.2

    {
      "attributes": [
        {"type": "float64", "name": "correlation"}
      ],
      "dimensions": [
        {"end": 3, "begin": 0, "type": "int64", "name": "component"},
        {"end": 3, "begin": 0, "type": "int64", "name": "input"}
      ]
    }

See Also
--------

-  :ref:`GET Model Array Attribute Chunk`

