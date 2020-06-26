GET Project Models
==================

.. http:get:: /api/projects/(pid)/models

  Returns a list of project models.

  :param pid: Unique project identifier.
  :type pid: string

  :param _: optional param for time to stop the browser from caching

  :responseheader Content-Type: application/json

  **Sample Request**

  .. sourcecode:: http

    GET /api/projects/fe372daf01f75276c7e5228e6e000024/models?_=1561069190303 HTTP/1.1
    Host: localhost:9000
    Connection: keep-alive
    Accept: */*
    DNT: 1
    X-Requested-With: XMLHttpRequest
    User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36
    Content-Type: application/json
    Referer: https://localhost:9000/projects/fe372daf01f75276c7e5228e6e000024
    Accept-Encoding: gzip, deflate, br
    Accept-Language: en-US,en;q=0.9
    Cookie: slycatauth=fa4387fcf4fe4070baea14195e708744; slycattimeout=timeout

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    X-Powered-By: Express
    content-length: 13232
    expires: 0
    server: CherryPy/14.0.0
    pragma: no-cache
    cache-control: no-cache, no-store, must-revalidate
    date: Thu, 20 Jun 2019 22:19:50 GMT
    content-type: application/json
    connection: close

    [
        {
            "model-type": "parameter-image",
            "name": "",
            "created": "2019-05-16T21:25:44.910816",
            "started": null,
            "input-artifacts": [],
            "_rev": "1-a48062f1fefaf92e4ea478a45e5b4635",
            "creator": "slycat",
            "marking": "",
            "project": "a15bbd2a5b3a9727f96cd87b4f0000a8",
            "bookmark": "none",
            "finished": null,
            "state": "waiting",
            "result": null,
            "progress": null,
            "artifact-types": {},
            "_id": "b2d24f5f43e74e23bf61397d6c61511b",
            "type": "model",
            "message": null,
            "description": ""
        },
        {
            "model-type": "parameter-image",
            "name": "",
            "created": "2019-05-16T21:03:31.509275",
            "started": null,
            "input-artifacts": [],
            "_rev": "1-9d1d329fe370660144d17cd1f60d292f",
            "creator": "slycat",
            "marking": "",
            "project": "a15bbd2a5b3a9727f96cd87b4f0000a8",
            "bookmark": "none",
            "finished": null,
            "state": "waiting",
            "result": null,
            "progress": null,
            "artifact-types": {},
            "_id": "1c309489eac04515bca914e60ef38fab",
            "type": "model",
            "message": null,
            "description": ""
        },
        {
            "artifact:output-columns": [],
            "creator": "slycat",
            "artifact-types": {
                "data-table": "hdf5",
                "error-messages": "json",
                "output-columns": "json",
                "category-columns": "json",
                "input-columns": "json",
                "image-columns": "json",
                "rating-columns": "json"
            },
            "_rev": "65-4052e01eed2b355dcaf45da56aa32bc5",
            "result": "succeeded",
            "message": "Storing data to array set data-table.",
            "artifact:input-columns": [],
            "marking": "",
            "bookmark": "none",
            "input-artifacts": [
                "data-table",
                "output-columns",
                "category-columns",
                "rating-columns",
                "image-columns",
                "input-columns"
            ],
            "state": "closed",
            "artifact:image-columns": [],
            "progress": 1,
            "type": "model",
            "artifact:data-table": "f262cae570764e5a8f19c9db7b6c6303",
            "description": "",
            "started": "2019-05-15T16:21:21.358504",
            "model-type": "parameter-image",
            "db_creation_time": 0.14256501197814941,
            "finished": "2019-05-15T16:21:21.371934",
            "name": "test2",
            "created": "2019-05-15T16:21:03.215165",
            "artifact:rating-columns": [],
            "artifact:category-columns": [],
            "project": "a15bbd2a5b3a9727f96cd87b4f0000a8",
            "artifact:error-messages": [],
            "project_data": [
                "511f5c51e60946f2a53830b116b4aea9"
            ],
            "_id": "b26d9a5d7b2f44729bffccad51fdfcf9"
        },
        {
            "artifact:output-columns": [],
            "creator": "slycat",
            "artifact-types": {
                "error-messages": "json",
                "output-columns": "json",
                "category-columns": "json",
                "rating-columns": "json",
                "image-columns": "json",
                "input-columns": "json"
            },
            "_rev": "36-568b9b50673a5ab0b81466561b99fde2",
            "result": "succeeded",
            "message": "Storing data to array set data-table.",
            "artifact:input-columns": [],
            "model-type": "parameter-image",
            "bookmark": "none",
            "input-artifacts": [
                "data-table",
                "output-columns",
                "category-columns",
                "rating-columns",
                "image-columns",
                "input-columns"
            ],
            "state": "closed",
            "artifact:image-columns": [],
            "progress": 1,
            "type": "model",
            "description": "",
            "started": "2019-05-15T16:20:56.171499",
            "marking": "",
            "db_creation_time": 0.10397696495056152,
            "finished": "2019-05-15T16:20:56.183040",
            "name": "test1",
            "created": "2019-05-15T16:20:27.485167",
            "artifact:rating-columns": [],
            "artifact:category-columns": [],
            "project": "a15bbd2a5b3a9727f96cd87b4f0000a8",
            "artifact:error-messages": [],
            "project_data": [],
            "_id": "d8448849a7974f2ba513aedb3f73c553"
        }
    ]
