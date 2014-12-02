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

As a special case, callers may pass `-` as the uid to request information about
the currently-logged-in user.

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

