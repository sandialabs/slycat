PUT Model Parameter
===================

.. http:put:: /api/models/(mid)/parameters/(aid)

  Stores a model parameter (name / value pair) artifact. The value is a
  JSON expression and may be arbitrarily complex.

  :param mid: Unique model identifier.
  :type mid: string

  :param aid: Unique artifact id (parameter name).
  :type aid: string

  :requestheader Content-Type: application/json

  :<json object value: New parameter value.
  :<json bool input: Set to true if the parameter is a model input.

  **Sample Request**

  .. sourcecode:: http

    PUT /api/models/1385a75dd2eb4faba884cefdd0b94a56/parameters/baz HTTP/1.1

    {
      value : [1, 2, 3],
      input : true
    }

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 200 OK
    Date: Mon, 25 Nov 2013 20:36:04 GMT
    Content-Length: 0
    Content-Type: text/html;charset=utf-8
    Server: CherryPy/3.2.2

See Also
--------

-  :http:get:`/api/models/(mid)/parameters/(aid)`


