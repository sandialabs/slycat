POST Login
===================

.. http:post:: /login

  Creates a session and then returns the session cookie

  :requestheader Content-Type: application/json

  :<json 64 bit encoded string name: username
  :<json 64 bit encoded string password: password
  :<json object url: origin url from which you came

  :responseheader Content-Type: application/json

  :>json boolean success: boolean representing successful login
  :>json string target: original url user tried to access (for a redirect after login)

  **Sample Request**

  .. sourcecode:: http

    POST /login HTTP/1.1
    Host: localhost:8092
    Content-Length: 45
    Accept-Encoding: gzip, deflate, compress
    Accept: */*
    User-Agent: python-requests/1.2.0 CPython/2.7.3 Linux/2.6.32-358.2.1.el6.x86_64
    content-type: application/json

    {
    "user_name":"64 bit encoded slycat(c2x5Y2F0)",
    "password":"64 bit encoded slycat(c2x5Y2F0)",
    "location":{
        "href":"https://192.168.99.100/login/slycat-login.html",
        "origin":"https://192.168.99.100",
        "protocol":"https:",
        "host":"192.168.99.100",
        "hostname":"192.168.99.100",
        "port":"",
        "pathname":"/login/slycat-login.html",
        "search":"",
        "hash":""
        }
    }

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 201 Project created.
    Date: Thu, 11 Apr 2013 21:30:16 GMT
    Content-Length: 42
    Content-Type: application/json
    Set-Cookie:"slycatauth=xyz;httponly;Max-Age=60000;Path=/;secure;slycattimeout=timeout;Max-Age=60000;Path=/"
    Location: http://localhost:8092/projects/505d0e463d5ed4a32bb6b0fe9a000d36
    Server: CherryPy/3.2.2

    {"target": "https://192.168.99.100/projects","success":true}

See Also
--------

- :http:delete:`/logout`