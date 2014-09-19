.. _POST Remote Browse:

POST Remote Browse
==================
Description
-----------

Uses an existing session to retrieve remote filesystem information.  The
session must have been created successfully using :ref:`POST Remote`.  The caller
*must* supply the session id, and the path on the remote filesystem to retrieve.

If the session doesn't exist or has timed-out, the server returns `404`.  If some
other error prevents the data from being returned, the server returns `400`.

Requests
--------

Syntax
^^^^^^

::

    POST /remote/browse

Accepts
^^^^^^^

application/json

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

  POST /remote/browse

  {
    sid: "505d0e463d5ed4a32bb6b0fe9a000d36",
    path: "/home/fred"
  }

Sample Response
^^^^^^^^^^^^^^^

::

  {
    "path" : "/home/fred",
    "names" : ["a.txt", "b.png", "c.csv", "subdir"],
    "sizes" : [1264, 456730, 78005, 4096],
    "types' : ["f", "f", "f", "d"]
  }

See Also
--------

* :ref:`POST Remote`
* :ref:`GET Remote File`

