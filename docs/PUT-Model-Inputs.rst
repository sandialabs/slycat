PUT Model Inputs
================

.. http:put:: /models/(mid)/inputs

  Copies the input artifacts from one model to another.
  Both models must be part of the same project.

  :param mid: Unique model identifier.
  :type mid: string

  :requestheader Content-Type: application/json

  :<json string sid: Unique identifier of the source model.

