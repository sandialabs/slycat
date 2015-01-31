GET Models
==========

.. http:get:: /models

  Retrieve the current set of models, and the current model revision
  number. **Caveat:** Currently, only "open" models are returned. Models
  may be in any of the four states "waiting", "running", "finished", or
  "closed", and any model not "closed" is considered "open".

  There are two forms of request, with a last-seen revision number and
  without. If a revision number is provided, the request will block until
  the state of any open model changes (long polling). If a revision number
  isn't provided, the request will return immediately.

      GET /models?revision=...

  :responseheader Content-Type: application/json

See Also
--------

