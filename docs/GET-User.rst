GET User
========

.. http:get:: /users/(uid)

  Retrieve directory information for a given user.

  :param uid: User id to retrieve.
    As a special case, callers may pass `-` as the uid to request information
    about the currently-logged-in user.
  :type uid: string

  :status 200: User metadata retrieved.
  :status 404: Unknown user.

  :responseheader Content-Type: application/json

  :>json string uid: User id of the requested user.
  :>json string email: Email address of the requested user.
  :>json string name: Full name of the requested user.

  **Sample Response**

  .. sourcecode:: http

    {
      "uid": "frfreder",
      "email": "fred@example.com",
      "name": "Fred R. Frederickson",
    }

