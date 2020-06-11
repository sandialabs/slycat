POST Remotes
============

.. http:post:: /remotes

  Creates a new remote connection from the Slycat server to another host.
  The caller *must* supply a remote hostname, username, and password.

  If the connection is created successfully, a unique session ID is returned.  The
  client must use the session ID in subsequent requests.

  :requestheader Content-Type: application/json

  :<json string hostname: Remote hostname.
  :<json string username: Remote host username.
  :<json string password: Remote host password.
  :<json boolean agent: (optional) Create an agent when the connection is established.  By default, agents are created automatically if the hostname has an agent configuration.  Use this parameter to explicitly require / prevent agent creation.

  :status 200: The connection was created successfully.
  :status 400: "Missing agent configuration" The server isn't configured to start an agent on the given hostname.
  :status 403: "Remote authentication failed" Authentication of the provided username and password failed.
  :status 500: "Missing agent configuration" The server isn't properly configured to start an agent on the given hostname.
  :status 500: "Agent startup failed" The server couldn't start an agent on the given hostname.
  :status 500: "Remote connection failed" Unknown failure making the remote connection.

  :responseheader Content-Type: application/json

  :>json string sid: Unique remote session identifier.

  **Sample Request**

  .. sourcecode:: http

      POST /remotes HTTP/1.1
      Host: localhost:8092
      Content-Length: 45
      Accept-Encoding: gzip, deflate, compress
      Accept: */*
      User-Remote: python-requests/1.2.0 CPython/2.7.3 Linux/2.6.32-358.2.1.el6.x86_64
      content-type: application/json
      Authorization: Basic c2x5Y2F0OnNseWNhdA==

      {"hostname":"example.com", "username":"fred", "password":"foobar"}

  **Sample Response**

  .. sourcecode:: http

      HTTP/1.1 200 OK.
      Date: Thu, 11 Apr 2013 21:30:16 GMT
      Content-Length: 42
      Content-Type: application/json
      Location: http://localhost:8092/projects/505d0e463d5ed4a32bb6b0fe9a000d36
      Server: CherryPy/3.2.2

      {"sid": "505d0e463d5ed4a32bb6b0fe9a000d36"}

See Also
--------

- :http:delete:`/remotes/(sid)`
- :http:post:`/remotes/(sid)/browse(path)`

