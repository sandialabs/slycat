.. _GET Model Table Unsorted Indices:

GET Model Table Unsorted Indices
================================
Description
-----------

Given a collection of sorted row indices and a specific sort order,
return the corresponding unsorted row indices.

Requests
--------

Syntax
^^^^^^

::

    GET /models/(mid)/tables/(aid)/arrays/(array)/unsorted-indices?rows=...&index=...sort=...&byteorder=...

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
-  :ref:`GET Model Table Sorted Indices`

