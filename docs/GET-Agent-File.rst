.. _GET Agent File:

GET Agent File
==============
Description
-----------

Uses an existing agent session to retrieve a remote file.  The session must
have been created successfully using :ref:`POST Agents`.  The caller *must*
supply the session id and the absolute path on the remote filesystem to
retrieve.

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

  GET /agents/(session)/file(path)

Responses
---------

Returns
^^^^^^^

The content of the file is returned in the body of the respone.  The MIME
type of the response is automatically determined using the filename.

Examples
--------

Sample Request
^^^^^^^^^^^^^^

::

  GET /agents/505d0e463d5ed4a32bb6b0fe9a000d36/file/home/fred/checklist.txt

See Also
--------

* :ref:`POST Agents`
* :ref:`POST Agent Browse`
* :ref:`GET Agent Image`

