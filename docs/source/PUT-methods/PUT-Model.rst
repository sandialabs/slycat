PUT Model
=========

.. http:put:: /api/models/(mid)

  Modifies a model. Callers may change the model name, description, state,
  result status, progress, and message.

  :param mid: Unique model identifier.
  :type mid: string

  :requestheader Content-Type: application/json

  :<json string name: optional, New model name.
  :<json string description: optional, New model description.
  :<json string state: optional, New model state.
  :<json float progress: optional, New model progress percent.
  :<json string message: optional, New model status message.

See Also
--------

- :http:get:`/api/models/(mid)`
- :http:post:`/api/models/(mid)/finish`
- :http:delete:`/api/models/(mid)`

