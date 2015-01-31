POST Model Finish
=================

.. http:post:: /models/(mid)/finish

  Finish (internally compute) a waiting model.  The model must be in the waiting state.

  :param mid: Unique model identifier.
  :type param: string

See Also
--------

- :http:get:`/models/(mid)`
- :http:put:`/models/(mid)`
- :http:delete:`/models/(mid)`

