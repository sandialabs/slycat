POST Model Finish
=================

.. http:post:: /api/models/(mid)/finish

  Finish (internally compute) a waiting model.  The model must be in the waiting state.

  :param mid: Unique model identifier.
  :type param: string

See Also
--------

- :http:get:`/api/models/(mid)`
- :http:put:`/api/models/(mid)`
- :http:delete:`/api/models/(mid)`

