PUT Model Arrayset
==================

.. http:put:: /api/models/(mid)/arraysets/(aid)

  Initialize an arrayset, a collection of zero-to-many arrays.

  :param mid: Unique model identifier.
  :type mid: string

  :param aid: Unique artifact id.
  :type aid: string

  :requestheader Content-Type: application/json

  :<json bool input: Set to true if this arrayset is a model input.

  **Sample Request**

  .. sourcecode:: http

    PUT /api/models/6f48db3de2b6416091d31e93814a22ae/arraysets/test-array-set HTTP/1.1

    { input : true }

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    Date: Mon, 25 Nov 2013 20:36:07 GMT
    Content-Length: 0
    Content-Type: text/html;charset=utf-8
    Server: CherryPy/3.2.2

See Also
--------

- :http:put:`/api/models/(mid)/arraysets/(aid)/arrays/(array)`
- :http:put:`/api/models/(mid)/arraysets/(aid)/data`

