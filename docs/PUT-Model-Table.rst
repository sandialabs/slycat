.. _PUT Model Table:

PUT Model Table
===============
Description
-----------

Upload a table, either from the client to the model or a remote host to
the model over SSH. To upload a file from the client, specify a single
parameter "file" with the file contents. To upload a remote file,
specify parameters "username", "hostname", "password", and "path". For
both cases specify an additional boolean parameter "input".

Requests
--------

Syntax
^^^^^^

::

    PUT /models/(mid)/tables/(name)

Accepts
^^^^^^^

form/multipart

See Also
--------

-  :ref:`POST Remote Browse`

