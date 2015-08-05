GET Model Table Sorted Indices
==============================

.. http:get:: /models/(mid)/tables/(aid)/arrays/(array)/sorted-indices

  .. warning:: This request is deprecated.  Use :http:get:`/models/(mid)/arraysets/(aid)/data` instead.

  Given a collection of row indices and a specific sort order, return the
  corresponding sorted row indices.

  :param mid: Unique model identifier.
  :type mid: string

  :param aid: Arrayset artifact id.
  :type aid: string

  :param array: Array index.
  :type array: int

  :query rows: Row indices to be sorted.
  :query index: Optional index column that can be used for sorting.
  :query sort: Sort order.
  :query byteorder: Optionally return the results as binary data.

  :responseheader Content-Type: application/json, application/octet-stream

See Also
--------

- :http:get:`/models/(mid)/tables/(aid)/arrays/(array)/chunk`
- :http:get:`/models/(mid)/tables/(aid)/arrays/(array)/metadata`
- :http:get:`/models/(mid)/tables/(aid)/arrays/(array)/unsorted-indices`
