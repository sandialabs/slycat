POST Project Models
===================

.. http:post:: /api/projects/(pid)/models

  Adds a new, empty model to a project.

  :param pid: Unique project identifier.
  :type pid: string

  :requestheader Content-Type: application/json

  :<json string model-type: Model type identifier.
  :<json string name: Model name.
  :<json string description: Model description.
  :<json string marking: Model marking identifier.

  :responseheader Content-Type: application/json

  :>json string id: Unique model identifier.

  **Sample Request**

  .. sourcecode:: http

    POST /projects/505d0e463d5ed4a32bb6b0fe9a000d36/models HTTP/1.1
    Host: localhost:8092
    Content-Length: 73
    Accept-Encoding: gzip, deflate, compress
    Accept: */*
    User-Agent: python-requests/1.2.0 CPython/2.7.3 Linux/2.6.32-358.2.1.el6.x86_64
    content-type: application/json
    Authorization: Basic c2x5Y2F0OnNseWNhdA==

    {"model-type": "generic", "description": "", "name": "Model", "marking": ""}

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 202 Model scheduled for creation.
    Date: Thu, 11 Apr 2013 21:30:16 GMT
    Content-Length: 85
    Content-Type: application/json
    Server: CherryPy/3.2.2

    {"id": "7f4b92c00af7465eb594a2ca77d0df91"}

See Also
--------

- :http:get:`/api/models/(mid)`
- :http:put:`/api/models/(mid)`
- :http:delete:`/api/models/(mid)`

