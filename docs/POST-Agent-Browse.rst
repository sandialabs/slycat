POST Agent Browse
=================

.. http:post:: /agents/(sid)/browse(path)

  Uses an existing agent session to retrieve remote filesystem information.
  The session must have been created successfully using :http:post:`/agents`.
  The caller *may* supply additional parameters to filter directories and files
  in the results, based on regular expressions.

  If the session doesn't exist or has timed-out, the server returns `404`.  If some
  other error prevents the data from being returned, the server returns `400`.

  :param sid: Unique agent session identifier.
  :type sid: string

  :param path: Remote filesystem path (must be absolute).
  :type path: string

  :requestheader Content-Type: application/json

  :<json string directory-reject: optional regular expression for filtering directories.
  :<json string directory-allow: optional regular expression for retaining directories.
  :<json string file-reject: optional regular expression for filtering files.
  :<json string file-allow: optional regular expression for allowing files.

  The regular expression parameters are matched against full file / directory
  paths.  If a file / directory matches a reject expression, it will not be
  included in the results, unless it also matches an allow expression.  So, to
  remove JPEG files from the results::

    file-reject: "[.]jpg$|[.]jpeg$"

  but to only return CSV files::

    file-reject: ".*",
    file-allow: "[.]csv$"

  :responseheader Content-Type: application/json

  **Sample Request**

  .. sourcecode:: http

    POST /agents/505d0e463d5ed4a32bb6b0fe9a000d36/browse/home/fred

    {
      file-reject: "[.]jpg$"
    }

  Sample Response

  .. sourcecode:: http

    {
      "path" : "/home/fred",
      "names" : ["a.txt", "b.png", "c.csv", "subdir"],
      "sizes" : [1264, 456730, 78005, 4096],
      "types' : ["f", "f", "f", "d"]
    }

See Also
--------

* :http:post:`/agents`
* :http:get:`/agents/(sid)/file(path)`
* :http:get:`/agents/(sid)/image(path)`

