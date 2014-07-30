.. _GET User:

GET User
========
Description
-----------

Used to retrieve directory information for a given user.

Requests
--------

Syntax
^^^^^^

::

    GET /users/(uid)

Responses
---------

Returns
^^^^^^^

application/json

Examples
--------

Sample Response
^^^^^^^^^^^^^^^

::

    {
      "email": "fred@example.com",
      "name": "fred",
      "roles": [],
      "server-administrator": false
    }

