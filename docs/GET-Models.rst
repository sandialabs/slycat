.. _GET Models:

GET Models
==========
Description
-----------

Retrieve the current set of models, and the current model revision
number. **Caveat:** Currently, only "open" models are returned. Models
may be in any of the four states "waiting", "running", "finished", or
"closed", and any model not "closed" is considered "open".

The HTML representation provides a simple user interface for viewing
open models and optionally closing them. Most clients will request the
JSON representation and create their own user interface.

Requests
--------

There are two forms of request, with a last-seen revision number and
without. If a revision number is provided, the request will block until
the state of any open model changes (long polling). If a revision number
isn't provided, the request will return immediately.

Syntax
^^^^^^

::

    GET /models
    GET /models?revision=...

Accepts
^^^^^^^

Optional query string.

Responses
---------

Returns
^^^^^^^

text/html, application/json

Examples
--------

Sample Request
^^^^^^^^^^^^^^

Sample Response
^^^^^^^^^^^^^^^

See Also
--------

