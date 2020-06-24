GET Model
=========

.. http:get:: /api/models/(mid)

  Returns a model.

  :param mid: Unique model identifier.
  :type mid: string

  :responseheader Content-Type: text/html, application/json

  **Sample Request**

  .. sourcecode:: http

    GET /api/models/05a06c0fa9cc40fc9d10087340425379 HTTP/1.1
    Host: localhost:9000
    Connection: keep-alive
    Accept: application/json, text/javascript, */*; q=0.01
    DNT: 1
    X-Requested-With: XMLHttpRequest
    User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36
    Referer: https://localhost:9000/models/05a06c0fa9cc40fc9d10087340425379
    Accept-Encoding: gzip, deflate, br
    Accept-Language: en-US,en;q=0.9
    Cookie: slycatauth=fa4387fcf4fe4070baea14195e708744; slycattimeout=timeout

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    X-Powered-By: Express
    content-length: 1426
    expires: 0
    server: CherryPy/14.0.0
    pragma: no-cache
    cache-control: no-cache, no-store, must-revalidate
    date: Thu, 20 Jun 2019 22:12:17 GMT
    content-type: application/json
    connection: close

    {
        "artifact:data-table": "80dd32573254477daa2d56bd15f90ef3",
        "description": "",
        "artifact:output-columns": [9, 10, 11, 12, 13, 14],
        "creator": "slycat",
        "artifact-types": {
          "data-table": "hdf5",
          "output-columns": "json",
          "output-structure-correlation": "hdf5",
          "input-structure-correlation": "hdf5",
          "canonical-indices": "hdf5",
          "cca-statistics": "hdf5",
          "input-columns": "json",
          "scale-inputs": "json",
          "canonical-variables": "hdf5"
        },
        "_rev": "2-e8d044f1938bb6e27bfb549ccda6d4a3",
        "artifact:scale-inputs": true,
        "finished": "2018-02-26T21:42:18.570154",
        "result": "succeeded",
        "artifact:output-structure-correlation":
        "7c1bc02b775949e1ad2ec28d9aa1c2ef",
        "message": "",
        "artifact:input-structure-correlation": "750eeb6345d94b8fae8b7856854d1718",
        "artifact:input-columns": [2, 3, 4, 5, 6, 7, 8],
        "artifact:canonical-variables": "49a0868cf1f84a5cb046e895812aa4c5",
        "model-type": "cca",
        "name": "DiodeClipper CCA Model",
        "artifact:cca-statistics": "a045e6bbf9144733aa82812334f21cc4",
        "analysis_computation_time": 0.8054931163787842,
        "input-artifacts": ["data-table", "input-columns", "scale-inputs", "output-columns"],
        "created": "2018-02-26T21:41:07.888827",
        "project": "fe372daf01f75276c7e5228e6e000024",
        "started": "2018-02-26T21:42:17.750279",
        "state": "closed",
        "progress": 1.0,
        "_id": "05a06c0fa9cc40fc9d10087340425379",
        "type": "model",
        "artifact:canonical-indices": "b178fa6eb1c14022b5327e7e7e59d39a",
        "marking": "faculty"
    }

See Also
--------

- :http:post:`/api/projects/(pid)/models`
- :http:put:`/api/models/(mid)`
- :http:delete:`/api/models/(mid)`

