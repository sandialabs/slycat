GET Projects
============

.. http:get:: /projects

  Returns the list of available projects. The HTML representation provides
  the main Slycat user interface.

  :reqheader Accept: text/html or application/json

  **Sample Request**

  .. sourcecode:: http

    GET /projects HTTP/1.1
    Host: localhost:8093
    Authorization: Basic c2x5Y2F0OnNseWNhdA==
    Accept-Encoding: gzip, deflate, compress
    accept: application/json
    User-Agent: python-requests/1.2.3 CPython/2.7.5 Linux/2.6.32-358.23.2.el6.x86_64

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    Date: Mon, 25 Nov 2013 20:35:59 GMT
    Content-Length: 570
    Content-Type: application/json
    Server: CherryPy/3.2.2

    [
      {
        "description": "",
        "created": "2013-11-25T20:35:58.955499",
        "_rev": "1-a4332c471d456db74398dd8ac20f8a61",
        "creator": "slycat",
        "acl": {"administrators": [{"user": "slycat"}], "writers": [], "readers": []},
        "_id": "dbaf026f919620acbf2e961ad732433d",
        "type": "project",
        "name": "bar"
      },
      {
        "description": "",
        "created": "2013-11-25T20:35:58.886682",
        "_rev": "1-99142f0b92a93266b9930914808fb286",
        "creator": "slycat",
        "acl": {"administrators": [{"user": "slycat"}], "writers": [], "readers": []},
        "_id": "dbaf026f919620acbf2e961ad7324011",
        "type": "project",
        "name": "foo"
      }
    ]

See Also
--------

-  :http:post:`/projects`

