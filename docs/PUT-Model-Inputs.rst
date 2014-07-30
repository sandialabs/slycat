.. _PUT Model Inputs:

PUT Model Inputs
================
Description
-----------

Copies the input artifacts from one model to another. The caller
supplies the id of the source model in the body of the message, e.g:

::

    { sid : "d72d91a0e187462ba0280adabce5e588" }

Requests
--------

Syntax
^^^^^^

::

    PUT /models/(mid)/inputs

Accepts
^^^^^^^

application/json

Preconditions
^^^^^^^^^^^^^

Both models must be part of the same project.
