GET Project
===========

.. http:get:: /projects/(pid)

  Returns a project.

  :param pid: Unique project identifier.
  :type pid: string

  :responseheader Content-Type: text/html, application/json

  **Sample Request**

  .. sourcecode:: http

    GET /projects/dbaf026f919620acbf2e961ad73243c5 HTTP/1.1
    Host: localhost:8093
    Authorization: Basic c2x5Y2F0OnNseWNhdA==
    Accept-Encoding: gzip, deflate, compress
    accept: application/json
    User-Agent: python-requests/1.2.3 CPython/2.7.5 Linux/2.6.32-358.23.2.el6.x86_64

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    Date: Mon, 25 Nov 2013 20:35:59 GMT
    Content-Length: 308
    Content-Type: application/json
    Server: CherryPy/3.2.2

    {
      "description": "My test project.",
      "created": "2013-11-25T20:35:59.555004",
      "_rev": "1-5af189cbba8ad4e0e200b2593f2594a2",
      "creator": "slycat",
      "acl": {"administrators": [{"user": "slycat"}], "writers": [], "readers": []},
      "_id": "dbaf026f919620acbf2e961ad73243c5",
      "type": "project",
      "name": "test-project"
    }

See Also
--------

- :http:put:`/projects/(pid)`
- :http:delete:`/projects/(pid)`
