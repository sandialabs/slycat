.. _POST Browse:

POST Browse
===========
Description
-----------

Retrieves remote filesystem information.

Requests
--------

Syntax
^^^^^^

::

    POST /browse

Accepts
^^^^^^^

application/json

Responses
---------

Returns
^^^^^^^

application/json

Examples
--------

Sample Request
^^^^^^^^^^^^^^

::

    POST /browse

    {
       username: "fred",
       hostname: "fred-workstation",
       password: "foo",
       path: "/home/fred"
    }

Sample Response
^^^^^^^^^^^^^^^

::

    {
      "path" : "/home/fred",
      "names" : ["a.txt", "b.png", "c.csv", "subdir"],
      "sizes" : [1264, 456730, 78005, 4096],
      "types' : ["f", "f", "f", "d"]
    }

