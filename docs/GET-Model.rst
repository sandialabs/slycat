GET Model
=========

.. http:get:: /api/models/(mid)

  Returns a model.

  :param mid: Unique model identifier.
  :type mid: string

  :responseheader Content-Type: text/html, application/json

  **Sample Request**

  .. sourcecode:: http

    GET /api/models/e32ef475e084432481655fe41348726b HTTP/1.1
    Host: localhost:8093
    Authorization: Basic c2x5Y2F0OnNseWNhdA==
    Accept-Encoding: gzip, deflate, compress
    accept: application/json
    User-Agent: python-requests/1.2.3 CPython/2.7.5 Linux/2.6.32-358.23.2.el6.x86_64

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    Date: Mon, 25 Nov 2013 20:36:01 GMT
    Content-Length: 542
    Content-Type: application/json
    Server: CherryPy/3.2.2

    {
      "description": "",
      "creator": "slycat",
      "artifact-types": {},
      "_rev": "2-80a35c0e45a33d6654fd13a90f17624a",
      "model-type": "generic",
      "finished": null,
      "result": null,
      "message": null,
      "marking": "",
      "name": "test-model",
      "created": "2013-11-25T20:36:01.064901",
      "input-artifacts": [],
      "uri": "http://localhost:8093/models/e32ef475e084432481655fe41348726b",
      "project": "dbaf026f919620acbf2e961ad7325359",
      "started": "2013-11-25T20:36:01.218447",
      "state": "running",
      "progress": 0.0,
      "_id": "e32ef475e084432481655fe41348726b",
      "type": "model"
    }

See Also
--------

- :http:post:`/api/projects/(pid)/models`
- :http:put:`/api/models/(mid)`
- :http:delete:`/api/models/(mid)`

