.. _DELETE Project:

DELETE Project
==============
Description
-----------

Deletes a project and all its models.

Requests
--------

Syntax
^^^^^^

::

    DELETE /projects/(pid)

Responses
---------

Returns
^^^^^^^

Examples
--------

Sample Request
^^^^^^^^^^^^^^

::

    DELETE /projects/dbaf026f919620acbf2e961ad732433d HTTP/1.1
    Host: localhost:8093
    Content-Length: 0
    Authorization: Basic c2x5Y2F0OnNseWNhdA==
    Accept-Encoding: gzip, deflate, compress
    Accept: */*
    User-Agent: python-requests/1.2.3 CPython/2.7.5 Linux/2.6.32-358.23.2.el6.x86_64

Sample Response
^^^^^^^^^^^^^^^

::

    HTTP/1.1 204 Project deleted.
    Date: Mon, 25 Nov 2013 20:35:59 GMT
    Content-Type: text/html;charset=utf-8
    Server: CherryPy/3.2.2

See Also
--------

-  :ref:`GET Project`
-  :ref:`PUT Project`

