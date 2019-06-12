DELETE Remote
=============

.. http:delete:: /remotes/(sid)

  Deletes a remote session created with :http:post:`/remotes`.

  :param sid: Unique session identifier.
  :type mid: string

  :status 204: The remote session has been deleted.

  **Sample Request**

  .. sourcecode:: http

    DELETE /remotes/dbaf026f919620acbf2e961ad732433d HTTP/1.1
    Host: localhost:8093
    Content-Length: 0
    Authorization: Basic c2x5Y2F0OnNseWNhdA==
    Accept-Encoding: gzip, deflate, compress
    Accept: */*
    User-Agent: python-requests/1.2.3 CPython/2.7.5 Linux/2.6.32-358.23.2.el6.x86_64

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 204 Session deleted.
    Date: Mon, 25 Nov 2013 20:35:59 GMT
    Content-Type: text/html;charset=utf-8
    Server: CherryPy/3.2.2

See Also
--------

- :http:post:`/remotes`

