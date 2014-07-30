.. _GET Model File:

GET Model File
==============
Description
-----------

Retrieves a file artifact from a model. File artifacts are effectively
binary blobs that may contain arbitrary data with an explicit content
type.

Requests
--------

Syntax
^^^^^^

::

    GET /models/(mid)/files/(aid)

Returns
^^^^^^^

The content type of the file artifact, which could be anything.
