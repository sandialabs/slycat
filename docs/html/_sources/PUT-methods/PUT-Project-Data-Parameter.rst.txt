PUT Project Data Parameter
==========================

.. http:put:: /api/data/(did)/aids/(aid)

  Adds a parameter to a project data database object.

  :param did: Unique project identifier.
  :type did: string
  :param aid: Unique artifact identifier.
  :type aid: string

**Sample Request**

  .. sourcecode:: http

    PUT /api/data/6df52b51a0e74b9da9af9eaf77cf66b6/aids/fe372daf01f75276c7e5228e6e000024 HTTP/1.1
    Host: localhost:8093
    Content-Length: 176
    Accept-Encoding: gzip, deflate, compress
    Accept: */*
    User-Agent: python-requests/1.2.3 CPython/2.7.5 Linux/2.6.32-358.23.2.el6.x86_64
    content-type: application/json
    Authorization: Basic c2x5Y2F0OnNseWNhdA==

    {"value": "my fancy value"}

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    Date: Mon, 25 Nov 2013 20:35:59 GMT
    Content-Length: 4
    Content-Type: application/json
    Server: CherryPy/3.2.2


See Also
--------

- :http:put:`/api/projects/(pid)/data/(file_key)/parser/(parser)/mid/(mid)/aids/(aids)`
