POST Projects
=============

.. http:post:: /projects

  Creates a new project. The caller *must* supply a human-readable project
  name. The caller *may* supply a human readable project description
  and/or access control list (ACL). The results will return the ID of the
  newly-created project.

  If an ACL is not specified, the project will have a default ACL with the
  project administrator set to the user creating the project, and no
  project readers or writers.

  :requestheader Content-Type: application/json

  :<json string name: New project name.
  :<json string description: New project description.
  :<json object acl: New project access control list.

  :responseheader Content-Type: application/json

  :>json string id: Unique project identifier.

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

    {"name": "CCA Model Test", "description": ""}

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

