.. _POST Projects:

POST Projects
=============
Description
-----------

Creates a new project. The caller *must* supply a human-readable project
name. The caller *may* supply a human readable project description
and/or access control list (ACL). The results will contain the ID of the
newly-created project.

If an ACL is not specified, the project will have a default ACL with the
project administrator set to the user creating the project, and no
project readers or writers.

Requests
--------

Syntax
^^^^^^

::

    POST /projects

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

    POST /projects HTTP/1.1
    Host: localhost:8092
    Content-Length: 45
    Accept-Encoding: gzip, deflate, compress
    Accept: */*
    User-Agent: python-requests/1.2.0 CPython/2.7.3 Linux/2.6.32-358.2.1.el6.x86_64
    content-type: application/json
    Authorization: Basic c2x5Y2F0OnNseWNhdA==

    {"name": "CCA Model Test", "description": ""}

Sample Result
^^^^^^^^^^^^^

::

    HTTP/1.1 201 Project created.
    Date: Thu, 11 Apr 2013 21:30:16 GMT
    Content-Length: 42
    Content-Type: application/json
    Location: http://localhost:8092/projects/505d0e463d5ed4a32bb6b0fe9a000d36
    Server: CherryPy/3.2.2

    {"id": "505d0e463d5ed4a32bb6b0fe9a000d36"}

See Also
--------

-  :ref:`GET Projects`

