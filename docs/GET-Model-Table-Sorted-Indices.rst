.. _GET Model Table Sorted Indices:

GET Model Table Sorted Indices
==============================
Description
-----------

Given a collection of row indices and a specific sort order, return the
corresponding sorted row indices.

Requests
--------

Syntax
^^^^^^

::

    GET /models/(mid)/tables/(aid)/arrays/(array)/sorted-indices?rows=...&index=...&sort=...&byteorder=...

Accepts
^^^^^^^

Query string.

Responses
---------

Returns
^^^^^^^

application/json, application/octet-stream

Examples
--------

Sample Request
^^^^^^^^^^^^^^

Sample Response
^^^^^^^^^^^^^^^

See Also
--------

-  :ref:`GET Model Table Chunk`
-  :ref:`GET Model Table Metadata`
-  :ref:`GET Model Table Unsorted Indices`

