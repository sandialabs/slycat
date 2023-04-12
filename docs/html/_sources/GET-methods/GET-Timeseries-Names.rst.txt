GET Timeseries Names
====================

.. http:get:: /api/users/(uid)

  Retrieve directory information for a given user.

  :param uid: User id to retrieve.
    As a special case, callers may pass `-` as the uid to request information
    about the currently-logged-in user.

  :param time: current seconds as a number
    number added to the webservice call to prevent browser caching

  :type uid: string

  :status 200: User metadata retrieved.
  :status 404: Unknown user.

  :responseheader Content-Type: application/json

  :>json string uid: User id of the requested user.
  :>json string email: Email address of the requested user.
  :>json string name: Full name of the requested user.

  **Sample Request**

  .. sourcecode:: http

    GET /api/users/-/1562786267913 HTTP/1.1
    Host: localhost:9000
    Connection: keep-alive
    Accept: */*
    DNT: 1
    X-Requested-With: XMLHttpRequest
    User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36
    Referer: https://localhost:9000/projects/fe372daf01f75276c7e5228e6e000024
    Accept-Encoding: gzip, deflate, br
    Accept-Language: en-US,en;q=0.9
    Cookie: InteractiveAnalysis=s%3A8d68aab2-0dca-4323-ad57-3b9beecd48b9.lx7aEaJwYLjaQaDeAIEicQHBS1X9Ph1BKcvNMNg731w; slycatauth=f7ff6a674c4a4ee6ab930474a78d24de; slycattimeout=timeout


  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    X-Powered-By: Express
    content-length: 66
    expires: 0
    server: CherryPy/14.0.0
    pragma: no-cache
    cache-control: no-cache, no-store, must-revalidate
    date: Wed, 10 Jul 2019 19:17:47 GMT
    content-type: application/json
    connection: close

    {
    "uid": "slycat",
    "name": "slycat",
    "email": "slycat@example.com"
    }

