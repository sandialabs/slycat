GET Model Resource
==================

.. http:get:: /resources/models/(mtype)/(resource)

  Returns a custom model resource (stylesheet, font, javascript, etc).

  Model plugins may register custom resources for use by the model's user
  interface.  This API is used when the client needs to retrieve those resources.

  :param mtype: Unique model type code.
  :type mtype: string

  :param resource: Custom resource name.
  :type resource: string

  :responseheader Content-Type: \*/\*

  **Sample Request**

  .. sourcecode:: http

    GET /resources/models/calculator/ui.css HTTP/1.1
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
    Content-Type: text/css
    Server: CherryPy/3.2.2

    ...

See Also
--------

-  :http:get:`/models/(mid)`
-  :http:get:`/models/(mid)/commands/(type)/(command)`

