.. _GET Agent Video:

GET Agent Video
===============
Description
-----------

Uses an existing agent session and video session to retrieve a remote video.  The session must
have been created successfully using :ref:`POST Agents` and video creation must have been
started using :ref:`POST Agent Video`.  The caller *must*
supply the session id and video session id of the video to retrieve.

If the session doesn't exist or has timed-out, the server returns `404`.

Otherwise, the requested video is returned to the caller.

Requests
--------

Syntax
^^^^^^

::

    GET /agents/(session)/videos/(video session)

Responses
---------

Returns
^^^^^^^

video/mp4 or video/webm, depending on the original :ref:`POST Agent Video` request.

Examples
--------

Sample Request
^^^^^^^^^^^^^^

::

  GET /agents/505d0e463d5ed4a32bb6b0fe9a000d36/videos/431d0e463d5ed4a32bb6b0fe9a000a37

See Also
--------

* :ref:`POST Agent Video`
* :ref:`GET Agent Video Status`

