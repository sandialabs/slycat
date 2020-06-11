GET Projects
============

.. http:get:: /api/projects

  Returns the list of available projects. The HTML representation provides
  the main Slycat user interface.
  
  :param _: optional param for time to stop the browser from caching

  :reqheader Accept: application/json

  **Sample Request**

  .. sourcecode:: http

    GET /api/projects_list?_=1561665367168 HTTP/1.1
    Host: localhost:9000
    Connection: keep-alive
    User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36
    DNT: 1
    Accept: */*
    Referer: https://localhost:9000/projects/fe372daf01f75276c7e5228e6e000024
    Accept-Encoding: gzip, deflate, br
    Accept-Language: en-US,en;q=0.9
    Cookie: slycatauth=f204afc7e8ce44e79cdd41fc78ecd41b; slycattimeout=timeout

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    X-Powered-By: Express
    content-length: 663
    expires: 0
    server: CherryPy/14.0.0
    pragma: no-cache
    cache-control: no-cache, no-store, must-revalidate
    date: Thu, 27 Jun 2019 19:56:07 GMT
    content-type: application/json
    connection: close

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

