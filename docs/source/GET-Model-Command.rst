GET Model Command
=================

.. http:get:: /api/models/(mid)/commands/(type)/(command)

  Execute a custom model command.

  Plugins may register custom commands to be executed on the server, using an
  existing model as context.  Custom commands are used to perform computation
  on the server instead of the client, and would typically use model artifacts
  as inputs.

  :param mid: Unique model identifier.
  :type mid: string

  :param type: Unique command category.
  :type type: string

  :param command: Custom command name.
  :type command: string

  Additional command-specific arguments may be passed using query strings.

  :responseheader Content-Type: \*/\*

  **Sample Request**

  .. sourcecode:: http

    GET /api/models/e32ef475e084432481655fe41348726b/commands/math-plugin/add HTTP/1.1
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
      "result" : 5
    }

See Also
--------

- :http:post:`/models/(mid)/commands/(type)/(command)`
- :http:put:`/api/models/(mid)/commands/(type)/(command)`

