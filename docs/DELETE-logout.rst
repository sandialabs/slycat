DELETE Logout
================

.. http:delete:: /logout

  Deletes a session and its browser cookie.

  **Sample Request**:

  .. sourcecode:: http

      DELETE /logout HTTP/1.1
      Host: localhost:8093
      Content-Length: 0
      Authorization: Basic c2x5Y2F0OnNseWNhdA==
      Accept-Encoding: gzip, deflate, compress
      Accept: */*
      User-Agent: python-requests/1.2.3 CPython/2.7.5 Linux/2.6.32-358.23.2.el6.x86_64
      Cookie: slycatauth=dee8324c69d2424385246edc8d92e996; slycattimeout=timeout

  **Sample Response**:

  .. sourcecode:: http

      HTTP/1.1 204 Model deleted.
      Cache-Control: no-cache, no-store, must-revalidate
      Content-Length: 0
      Content-Type: text/html;charset=utf-8
      Date: Wed, 16 Mar 2016 16:31:53 GMT
      Expires: 0
      Pragma: no-cache
      Server: CherryPy/4.0.0
      Set-Cookie: slycatauth=dee8324c69d2424385246edc8d92e996; expires=Wed, 16 Mar 2016 16:31:53 GMT;
        slycattimeout=timeout; expires=Wed, 16 Mar 2016 16:31:53 GMT

See Also
--------

- :http:post:`/login`

