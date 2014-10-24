.. _POST Agent Video:

POST Agent Video
================
Description
-----------

Uses an existing agent session to create a video from a sequence of images.
The session must have been created successfully using :ref:`POST Agents`.  The
caller *must* supply the session id, the desired video content type, and the
paths of source images on the remote filesystem.  Because video compression may
be time-consuming, a unique video session ID is returned.  The client must
supply the video session ID along with the agent session ID in subsequent
:ref:`GET Agent Video Status` and :ref:`GET Agent Video` requests.

If the session doesn't exist or has timed-out, the server returns `404`.  If some
other error prevents the data from being returned, the server returns `400`.

Requests
--------

Syntax
^^^^^^

::

    POST /agents/(session)/videos

Accepts
^^^^^^^

application/json

Parameters
^^^^^^^^^^

* content-type - required content type for the final video.  Currently limited to "video/mp4" or "video/webm".
* images - required list of absolute paths pointing to static images.

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

  POST /agents/505d0e463d5ed4a32bb6b0fe9a000d36/videos

  {
    content-type: "video/mp4",
    images: ["/home/fred/1.jpg", "/home/fred/2.jpg", "/home/fred/3.jpg", ...],
  }

Sample Response
^^^^^^^^^^^^^^^

::

  {
    "sid" : 431d0e463d5ed4a32bb6b0fe9a000a37
  }

See Also
--------

* :ref:`GET Agent Video`
* :ref:`GET Agent Video Status`

