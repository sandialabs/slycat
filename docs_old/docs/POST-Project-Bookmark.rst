POST Project Bookmark
=====================

.. http:post:: /projects/(pid)/bookmarks

  Stores a bookmark - an arbitrary JSON object that captures client-side
  state - returning a unique identifier that can be used to retrieve that
  state.

  Note that the bookmark contents are canonicalized and hashed to produce
  the returned identifier, so all bookmarks containing the same state
  automatically share the same id.

  Typically, a client would store a bookmark anytime the client state
  changes as a user is interacting with a model, e.g. making selections,
  sorting, choosing color maps, etc. The client can then use the returned
  bookmark id to restore that state when the user returns to a given
  model. We strongly recommend that web browsers incorporate the returned
  bookmark id into the browser's URL, so the resulting visualization can
  be saved as a browser bookmark, emailed to a colleague, etc.

  :param pid: Unique project identifier.
  :type pid: string

  :requestheader Content-Type: application/json

  :responseheader Content-Type: application/json

  :>json string id: Unique bookmark identifier.

  **Sample Request**

  .. sourcecode:: http

      POST /projects/957cb70e7a31529d266fb0c110000f27/bookmarks HTTP/1.1
      Host: localhost:8092
      Content-Length: 43
      Accept-Encoding: gzip, deflate, compress
      Accept: */*
      User-Agent: python-requests/1.2.0 CPython/2.7.3 Linux/2.6.32-358.6.1.el6.x86_64
      content-type: application/json
      Authorization: Basic c2x5Y2F0OnNseWNhdA==

      {"selected-row": 13, "selected-column": 34}

  **Sample Response**

  .. sourcecode:: http

      HTTP/1.1 201 Bookmark stored.
      Date: Thu, 25 Apr 2013 21:33:44 GMT
      Content-Length: 42
      Content-Type: application/json
      Location: http://localhost:8092/bookmarks/da47466b64216fbb5f782bc2487ceed0
      Server: CherryPy/3.2.2

      {"id": "da47466b64216fbb5f782bc2487ceed0"}

See Also
--------

-  :http:get:`/bookmarks/(bid)`

