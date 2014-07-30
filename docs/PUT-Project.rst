.. _PUT Project:

PUT Project
===========
Description
-----------

Modifies a project. Callers may use PUT to specify a new name,
description, or access control list (ACL) for the project.

Requests
--------

Syntax
^^^^^^

::

    PUT /projects/(pid)

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

    PUT /projects/dbaf026f919620acbf2e961ad73243c5 HTTP/1.1
    Host: localhost:8093
    Content-Length: 176
    Accept-Encoding: gzip, deflate, compress
    Accept: */*
    User-Agent: python-requests/1.2.3 CPython/2.7.5 Linux/2.6.32-358.23.2.el6.x86_64
    content-type: application/json
    Authorization: Basic c2x5Y2F0OnNseWNhdA==

    {
      "acl": {"administrators": [{"user": "slycat"}], "writers": [{"user": "foo"}], "readers": [{"user": "bar"}]},
      "name": "modified-project",
      "description": "My modified project."
    }

Sample Response
^^^^^^^^^^^^^^^

::

    HTTP/1.1 200 OK
    Date: Mon, 25 Nov 2013 20:35:59 GMT
    Content-Length: 4
    Content-Type: application/json
    Server: CherryPy/3.2.2

    null

See Also
--------

-  :ref:`GET Project`
-  :ref:`DELETE Project`

