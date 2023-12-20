PUT Project CSV Data
====================

.. http:put:: /api/projects/(pid)/data/(file_key)/parser/(parser)/mid/(mid)/aids/(aids)

  Modifies a model. Callers may change the model name, description, state,
  result status, progress, and message.

  :param pid: Unique project identifier.
  :type pid: string
  :param mid: Unique model identifier.
  :type mid: string
  :param file_key: Unique file name identifier.
  :type file_key: string
  :param aids: Unique artifact identifier.
  :type aids: string
  :param parser: Unique parser identifier.
  :type parser: string

**Sample Request**

  .. sourcecode:: http

    PUT /api/projects/fe372daf01f75276c7e5228e6e000024/data/2023-12-19%2023:52:53_cars_small.csv/parser/slycat-csv-parser/mid/6df52b51a0e74b9da9af9eaf77cf66b6/aids/data-table HTTP/1.1
    Host: localhost:8093
    Content-Length: 176
    Accept-Encoding: gzip, deflate, compress
    Accept: */*
    User-Agent: python-requests/1.2.3 CPython/2.7.5 Linux/2.6.32-358.23.2.el6.x86_64
    content-type: application/json
    Authorization: Basic c2x5Y2F0OnNseWNhdA==

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    Date: Mon, 25 Nov 2013 20:35:59 GMT
    Content-Length: 4
    Content-Type: application/json
    Server: CherryPy/3.2.2

    {"Status": "Success"}

See Also
--------

- :http:get:`/api/projects/(pid)`
