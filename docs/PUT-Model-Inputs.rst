PUT Model Inputs
================

.. http:put:: /models/(mid)/inputs

  Copies the input artifacts from one model to another.
  Both models must be part of the same project.  By default,
  array artifacts are copied by reference instead of value
  for efficiency.

  :param mid: Unique model identifier.
  :type mid: string

  :requestheader Content-Type: application/json

  :<json string sid: Unique identifier of the source model.
  :<json bool deep-copy: Optional, make deep copies of input data if "true".

