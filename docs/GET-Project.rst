GET Project
===========

.. http:get:: /api/projects/(pid)

  Returns a project.

  :param pid: Unique project identifier.
  :type pid: string

  :responseheader Content-Type: application/json

  **Sample Request**

  .. sourcecode:: http

    GET /api/projects/fe372daf01f75276c7e5228e6e000024 HTTP/1.1
    Host: localhost:9000
    Connection: keep-alive
    Accept: */*
    DNT: 1
    X-Requested-With: XMLHttpRequest
    User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36
    Content-Type: application/json
    Referer: https://localhost:9000/projects/fe372daf01f75276c7e5228e6e000024
    Accept-Encoding: gzip, deflate, br
    Accept-Language: en-US,en;q=0.9
    Cookie: slycatauth=b57221cc8a1041188f6c52b4ee4e544d; slycattimeout=timeout

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    X-Powered-By: Express
    content-length: 332
    expires: 0
    server: CherryPy/14.0.0
    pragma: no-cache
    cache-control: no-cache, no-store, must-revalidate
    date: Wed, 26 Jun 2019 21:18:54 GMT
    content-type: application/json
    connection: close

    {
      "description": "Examples of Slycat model types",
      "created": "2018-02-26T20:16:35.093958",
      "_rev": "1-3049afb4ba9420713d875c245ee0451c",
      "creator": "slycat",
      "acl": {
        "administrators": [
          {
            "user": "slycat"
          }
        ],
        "writers": [],
        "groups": [],
        "readers": []
      },
      "_id": "fe372daf01f75276c7e5228e6e000024",
      "type": "project",
      "name": "Examples"
    }

See Also
--------

- :http:put:`/api/projects/(pid)`
- :http:delete:`/api/projects/(pid)`
