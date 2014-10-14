.. _POST Agent Image:

POST Agent Image
================
Description
-----------

Uses an existing agent session to retrieve a remote image.  The
session must have been created successfully using :ref:`POST Agents`.  The caller
*must* supply the session id and the path on the remote filesystem to retrieve.
The caller *may* supply additional parameters to resize the image and / or convert
it to another file type.

If the session doesn't exist or has timed-out, the server returns `404`.

If the remote path is a reference to a directory, the server returns `400 Can't read directory.`

If the remote path doesn't exist, the server returns `400 File not found.`

If the session user doesn't have permissions to access the file, the server returns `400 Permission denied. Current permissions:` with a summary of the file permissions.

For other errors, the server returns `400 Remote access failed:` with additional error information.

Otherwise, the requested file is returned to the caller.

Requests
--------

Syntax
^^^^^^

::

    POST /agents/image

Responses
---------

Returns
^^^^^^^

image/jpeg or image/png

Examples
--------

Sample Request
^^^^^^^^^^^^^^

::

  POST /agents/image

  {
    sid: "505d0e463d5ed4a32bb6b0fe9a000d36",
    path: "/home/fred/avatar.png",
    content-type: "image/jpeg",
    max-width: 64,
  }

See Also
--------

* :ref:`POST Agents`
* :ref:`POST Agent Browse`
* :ref:`POST Agent File`

