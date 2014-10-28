.. _GET Model Resource:

GET Model Resource
==================

Description
-----------

Returns a custom model resource (stylesheet, font, javascript, etc).

Model plugins may register custom resources for use by the model's user
interface.  This API is used when the client requests those resources.

Requests
--------

Syntax
^^^^^^

::

    GET /resources/models/(mtype)/(resource)

Responses
---------

Returns
^^^^^^^

\*/\*

Examples
--------

Sample Request
^^^^^^^^^^^^^^

::

    GET /resources/models/calculator/ui.css HTTP/1.1
    Host: localhost:8093
    Authorization: Basic c2x5Y2F0OnNseWNhdA==
    Accept-Encoding: gzip, deflate, compress
    accept: application/json
    User-Agent: python-requests/1.2.3 CPython/2.7.5 Linux/2.6.32-358.23.2.el6.x86_64

Sample Response
^^^^^^^^^^^^^^^

::

    HTTP/1.1 200 OK
    Date: Mon, 25 Nov 2013 20:36:01 GMT
    Content-Length: 542
    Content-Type: text/css
    Server: CherryPy/3.2.2

    ...

See Also
--------

-  :ref:`GET Model`
-  :ref:`GET Model Command`

