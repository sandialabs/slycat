GET Model Statistics
====================

.. http:get:: /api/get-model-statistics/(mid)

  Gets statistics on the model

  :param mid: Unique model identifier.
  :type mid: string

  :param aid: Parameter artifact id.
  :type aid: string

  :responseheader Content-Type: application/json

  **Sample Request**

  .. sourcecode:: http

    GET /api/get-model-statistics/55e0957463b0419da1514b50500a6553 HTTP/1.1
    Host: localhost:9000
    Connection: keep-alive
    Accept: */*
    DNT: 1
    X-Requested-With: XMLHttpRequest
    User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36
    Referer: https://localhost:9000/models/55e0957463b0419da1514b50500a6553?bid=8cc846df59bb36ee40ff6536fbc656d3
    Accept-Encoding: gzip, deflate, br
    Accept-Language: en-US,en;q=0.9
    Cookie: slycatauth=fa4387fcf4fe4070baea14195e708744; slycattimeout=timeout

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    X-Powered-By: Express
    content-length: 595
    expires: 0
    server: CherryPy/14.0.0
    pragma: no-cache
    cache-control: no-cache, no-store, must-revalidate
    date: Thu, 20 Jun 2019 17:49:39 GMT
    content-type: application/json
    connection: close

    {
        "server_cache_size": 0,
        "mid": "514ac8d82e834e6cae2c25307ac1e69f",
        "hdf5_file_size": 0.4987030029296875,
        "total_server_data_size": 0.49985504150390625,
        "hdf5_store_size": 13.80262565612793,
        "model": {
            "_id": "514ac8d82e834e6cae2c25307ac1e69f",
            "_rev": "2-bd4be5f861b59ee95d42bf6c987d44a0",
            "artifact:data-table": "42545f0d0ed645a7bba3b64be0c9fa12",
            "description": "Taylor Anvil Impact Scenario",
            "artifact:output-columns": [
                1,
                2
            ],
            "creator": "slycat",
            "artifact-types": {
                "data-table": "hdf5",
                "error-messages": "json",
                "output-columns": "json",
                "category-columns": "json",
                "rating-columns": "json",
                "image-columns": "json",
                "input-columns": "json"
            },
            "model-type": "parameter-image",
            "db_creation_time": 0.09084701538085938,
            "finished": "2018-02-26T21:15:42.641794",
            "result": "succeeded",
            "message": "",
            "artifact:input-columns": [
                3,
                4,
                5,
                6
            ],
            "marking": "airmail",
            "name": "TAIS Parameter Space Model",
            "created": "2018-02-26T21:14:17.755867",
            "input-artifacts": [
                "data-table",
                "output-columns",
                "category-columns",
                "rating-columns",
                "image-columns",
                "input-columns"
            ],
            "artifact:rating-columns": [],
            "artifact:category-columns": [],
            "project": "fe372daf01f75276c7e5228e6e000024",
            "started": "2018-02-26T21:15:42.633699",
            "state": "closed",
            "artifact:error-messages": [],
            "artifact:image-columns": [
                7,
                8,
                9,
                10,
                11,
                12,
                13,
                14
            ],
            "progress": 1.0,
            "type": "model"
        },
        "delta_creation_time": 1.41476545,
        "couchdb_doc_size": 0.00115203857421875,
        "hdf5_footprint": 3.613102429596641,
        "job_pending_time": 0.0,
        "job_running_time": 0.0,
        "model_compute_time": 0.0,
        "pulling_time": 0.0,
        "analysis_computation_time": 0.0,
        "db_creation_time": 0.09084701538085938
    }

See Also
--------

- :http:get:`/api/models/(mid)`
