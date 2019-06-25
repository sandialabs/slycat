DELETE Upload
=============

.. http:delete:: /api/uploads/(uid)

    Delete an upload session used to upload files for storage as model artifacts.
    This function must be called once the client no longer needs the session, whether
    the upload(s) have been completed successfully or the client is cancelling an
    incomplete session.

    :param uid: Unique upload session identifier.
    :type uid: string

    :status 204: The upload session and any temporary storage have been deleted.
    :status 409: The upload session cannot be deleted, because parsing is in progress.  Try again later.

  **Sample Request**

  .. sourcecode:: http

    DELETE /api/uploads/f2856ac3535f4bb58956a06f72e25c96 HTTP/1.1
    Host: localhost:9000
    Connection: keep-alive
    Accept: */*
    Origin: https://localhost:9000
    X-Requested-With: XMLHttpRequest
    User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.80 Safari/537.36
    DNT: 1
    Referer: https://localhost:9000/models/b26d9a5d7b2f44729bffccad51fdfcf9?bid=405d84f7553f53736beabdf874d55356
    Accept-Encoding: gzip, deflate, br
    Accept-Language: en-US,en;q=0.9
    Cookie: slycatauth=e9528234ede94e159fc21ef2f744323f; slycattimeout=timeout

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 409 Parsing in progress.
    X-Powered-By: Express
    content-length: 1864
    server: CherryPy/14.0.0
    pragma: no-cache
    cache-control: no-cache, no-store, must-revalidate
    date: Fri, 14 Jun 2019 17:27:56 GMT
    content-type: text/html;charset=utf-8
    connection: close

See Also
--------

* :http:post:`/api/uploads/(uid)/finished`

