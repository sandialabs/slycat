GET Configuration Markings
==========================

.. http:get:: /api/configuration/markings

  Retrieves the markings as a json array of marking objects. An example response is presented in this document.

  :responseheader Content-Type: application/json

  **Sample Request**

  .. sourcecode:: http

    GET /api/configuration/markings HTTP/1.1
    Host: localhost:9000
    Connection: keep-alive
    Accept: application/json, text/javascript, */*; q=0.01
    DNT: 1
    X-Requested-With: XMLHttpRequest
    User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.80 Safari/537.36
    Referer: https://localhost:9000/models/b26d9a5d7b2f44729bffccad51fdfcf9?bid=405d84f7553f53736beabdf874d55356
    Accept-Encoding: gzip, deflate, br
    Accept-Language: en-US,en;q=0.9
    Cookie: slycatauth=e9528234ede94e159fc21ef2f744323f; slycattimeout=timeout

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    X-Powered-By: Express
    content-length: 43
    expires: 0
    server: CherryPy/14.0.0
    pragma: no-cache
    cache-control: no-cache, no-store, must-revalidate
    date: Fri, 14 Jun 2019 19:41:58 GMT
    content-type: application/json
    connection: close

    [
      {
        "label": "None",
        "badge": "",
        "page-before": null,
        "page-after": null,
        "type": "mna"
      }
    ]

See Also
--------

- :http:get:`/api/configuration/selectable-markings`
