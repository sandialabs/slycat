GET Project References
======================

.. http:get:: /api/projects/(pid)/references

  Returns an array of project references.

  :status 200:

  :responseheader Content-Type: application/json

  **Sample Request**

  .. sourcecode:: http

    GET /api/projects/fe372daf01f75276c7e5228e6e000024/references HTTP/1.1
    Host: localhost:9000
    Connection: keep-alive
    Accept: application/json, text/javascript, */*; q=0.01
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
    content-type: application/json;charset=utf-8
    content-length: 43
    expires: 0
    server: CherryPy/18.8.0
    pragma: no-cache
    cache-control: no-cache, no-store, must-revalidate
    date: Fri, 20 Oct 2023 15:55:35 GMT
    connection: close

    [
        {
            "_id": "fa63f9aadd4d4adc8ec4941f7d228ed0",
            "_rev": "1-93c1fc496dd32f43c41ff435c758c4d1",
            "model-type": "cca",
            "name": "Unusual displacement relative to weight (color coded by displacement)",
            "created": "2018-02-26T20:21:06.186245",
            "creator": "slycat",
            "mid": "bbf6715c95a7481d8517a74a6154fbd1",
            "project": "fe372daf01f75276c7e5228e6e000024",
            "type": "reference",
            "bid": "29d79f0318632aba31dbba832536f799"
        }
    ]

See Also
--------

- :http:get:`/api/bookmarks/(bid)`
