POST Login Function
===================

.. http:post:: /login

  Creates a session and then returns the session cookie

  :requestheader Content-Type: application/json

  :<json string name: username
  :<json string password: password
  :<json object url: url from which you came

  :responseheader Content-Type: application/json

  :>json boolean success: boolean

  **Sample Request**

  .. sourcecode:: http

    POST /projects HTTP/1.1
    Host: localhost:8092
    Content-Length: 45
    Accept-Encoding: gzip, deflate, compress
    Accept: */*
    User-Agent: python-requests/1.2.0 CPython/2.7.3 Linux/2.6.32-358.2.1.el6.x86_64
    content-type: application/json
    Authorization: Basic c2x5Y2F0OnNseWNhdA==

    {"name": "username", "description": ""}

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 201 Project created.
    Date: Thu, 11 Apr 2013 21:30:16 GMT
    Content-Length: 42
    Content-Type: application/json
    Location: http://localhost:8092/projects/505d0e463d5ed4a32bb6b0fe9a000d36
    Server: CherryPy/3.2.2

    {"id": "505d0e463d5ed4a32bb6b0fe9a000d36"}

See Also
--------

- :http:get:`/projects`