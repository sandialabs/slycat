.. _PUT Model File:

PUT Model File
==============
Description
-----------

Upload a file artifact (opaque blob with content type), from the client
to the model. Specify a parameter "file" with the file contents in the
body of the request, along with an additional boolean parameter "input".

Requests
--------

Syntax
^^^^^^

::

    PUT /models/(mid)/files/(name)

Accepts
^^^^^^^

form/multipart

See Also
--------

-  :ref:`PUT Model Table`

