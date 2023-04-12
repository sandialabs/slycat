GET Model Parameter
===================

.. http:get:: /api/models/(mid)/parameters/(aid)

  Retrieves a model parameter (name / value pair) artifact. The result is a
  JSON expression and may be arbitrarily complex.

  :param mid: Unique model identifier.
  :type mid: string

  :param aid: Parameter artifact id.
  :type aid: string

  :responseheader Content-Type: application/json

  **Sample Request**

  .. sourcecode:: http

    GET /api/models/55e0957463b0419da1514b50500a6553/parameters/dac-ui-parms HTTP/1.1
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
        "POINT_COLOR": "whitesmoke",
        "PADDING_BOTTOM": 14,
        "Y_LABEL_PADDING": 13,
        "OUTLINE_NO_SEL": 1,
        "PADDING_RIGHT": 10,
        "NO_SEL_COLOR": "gray",
        "SELECTION_1_COLOR": "red",
        "POINT_SIZE": 5,
        "Y_TICK_FREQ": 40,
        "ALPHA_STEP": 0.001,
        "COLOR_BY_HIGH": "dimgray",
        "PADDING_TOP": 10,
        "X_TICK_FREQ": 80,
        "SCATTER_BUTTONS_HEIGHT": 37,
        "SCATTER_BORDER": 0.025,
        "PLOTS_PULL_DOWN_HEIGHT": 38,
        "ALPHA_BUTTONS_HEIGHT": 33,
        "X_LABEL_PADDING": 4,
        "PADDING_LEFT": 37,
        "SELECTION_2_COLOR": "blue",
        "OUTLINE_SEL": 2,
        "ALPHA_SLIDER_WIDTH": 170,
        "COLOR_BY_LOW": "white",
        "MAX_POINTS_ANIMATE": 2500,
        "LABEL_OPACITY": 0.2
    }

See Also
--------

- :http:put:`/api/models/(mid)/parameters/(aid)`

