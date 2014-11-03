.. _GET Agent Image:

GET Agent Image
===============
Description
-----------

Uses an existing agent session to retrieve a remote image.  The session must
have been created successfully using :ref:`POST Agents`.  The caller *must*
supply the session id and the path on the remote filesystem to retrieve.  The
caller *may* supply additional parameters to resize the image and / or convert
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

    GET /agents/(session)/image(path)

Parameters
^^^^^^^^^^

* content-type - optional image content type to return.  Currently limited to `image/jpeg` or `image/png`.  If the requested content type doesn't match the content type of the remote image, it will be converted.
* max-size - optional maximum image size in pixels along either dimension.  Images larger than this size will be resized to fit, while maintaining their aspect ratio.
* max-width - optional maximum image width.  Wider images will be resized to fit, while maintaining their aspect ratio.
* max-height - optional maximum image height.  Taller images will be resized to fit, while maintaining their aspect ratio.

Note that specifying max-size, max-width, max-height, or a content-type that
doesn't match the type of the underlying file will reduce performance
significantly as the agent must then decompress, resample, and recompress the
image before sending it to the client.

Responses
---------

Returns
^^^^^^^

image/jpeg or image/png, depending on the type of the remote file and request content-type.

Examples
--------

Sample Request
^^^^^^^^^^^^^^

::

  GET /agents/505d0e463d5ed4a32bb6b0fe9a000d36/image/home/fred/avatar.png?content-type=image/jpeg&max-width=64

See Also
--------

* :ref:`POST Agents`
* :ref:`POST Agent Browse`
* :ref:`GET Agent File`

