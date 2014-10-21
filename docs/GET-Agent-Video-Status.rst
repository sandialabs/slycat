.. _GET Agent Video Status:

GET Agent Video Status
======================
Description
-----------

Uses an existing agent session and video session to retrieve the status of a
video creation command.  The session must have been created successfully using
:ref:`POST Agents` and video creation must have been started using :ref:`POST Agent Video`.
The caller *must* supply the session id and the video session id
for the video status to retrieve.

If the session doesn't exist or has timed-out, the server returns `404`.

Otherwise, the status is returned to the caller.

Requests
--------

Syntax
^^^^^^

::

    GET /agents/(session)/videos/(video session)/status

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

  GET /agents/505d0e463d5ed4a32bb6b0fe9a000d36/videos/431d0e463d5ed4a32bb6b0fe9a000a37/status

See Also
--------

* :ref:`POST Agent Video`
* :ref:`GET Agent Video`

