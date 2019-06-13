DELETE Logout
================

.. http:delete:: /logout

  :synopsis: Deletes a session and its browser cookie.

  **Sample Request**:

  .. sourcecode:: http

      DELETE /logout HTTP/1.1
      Accept: */*
      Accept-Encoding: gzip, deflate, br
      Accept-Language: en-US,en;q=0.9
      Connection: keep-alive
      Cookie: slycatauth=4326db67af3f46f3bbb77f338c3ca4c3; slycattimeout=timeout
      DNT: 1
      Host: localhost:9000
      Origin: https://localhost:9000
      Referer: https://localhost:9000/
      User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.80 Safari/537.36
      X-Requested-With: XMLHttpRequest

  **Sample Response**:

  .. sourcecode:: http

      HTTP/1.1 204 Model deleted.
      cache-control: no-cache, no-store, must-revalidate
      connection: close
      content-length: 0
      content-type: text/html;charset=utf-8
      date: Thu, 13 Jun 2019 19:50:28 GMT
      expires: 0
      pragma: no-cache
      server: CherryPy/14.0.0
      set-cookie: slycatauth=4326db67af3f46f3bbb77f338c3ca4c3; expires=Thu, 13 Jun 2019 19:50:29 GMT
      set-cookie: slycattimeout=timeout; expires=Thu, 13 Jun 2019 19:50:29 GMT
      X-Powered-By: Express

  :statuscode 200: session deleted
  :statuscode 400: Bad Request no session to delete. or Bad Request on generic exception
  :statuscode 403: Forbidden, there was no cookie passed with the request

See Also
--------

- :http:post:`api/login`

